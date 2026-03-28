from __future__ import annotations

import asyncio
import asyncpg
import base64
import io
import logging
from datetime import date
from typing import TypedDict

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from src.config.settings import settings
from src.data.clients.s3_client import s3_client

logger = logging.getLogger(__name__)


class VehicleDocState(TypedDict):
    vehicle_id: str
    insurance_url: str | None
    rc_url: str | None
    puc_url: str | None
    insurance_expiry_date: str | None
    rc_expiry_date: str | None
    puc_expiry_date: str | None
    error: str | None
    success: bool


def _pdf_bytes_to_base64_image(pdf_bytes: bytes) -> str | None:
    """
    Convert first page of a PDF (as raw bytes) to a base64 JPEG image.

    Uses PyMuPDF (fitz) — a pure Python wheel with no external dependencies.
    Replaces pdf2image which required Poppler binaries (not installed on Windows).

    Install: pip install pymupdf
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]

        # Render at 2x scale for good OCR quality (equivalent to ~144 dpi)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)

        img_bytes = pix.tobytes("jpeg")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        return f"data:image/jpeg;base64,{b64}"

    except Exception as e:
        logger.error("PyMuPDF failed to render PDF: %s", e, exc_info=True)
        return None


def _pdf_url_to_base64_image(url: str) -> str | None:
    """
    Download PDF from private S3 using AWS credentials, render first page as JPEG.
    """
    try:
        key = s3_client.url_to_key(url)
        pdf_bytes = s3_client.download_bytes(key)
        return _pdf_bytes_to_base64_image(pdf_bytes)
    except Exception as e:
        logger.error("Failed to download PDF from S3 for URL %s: %s", url, e, exc_info=True)
        return None


async def _extract_date_from_doc_image(image_b64: str, doc_type: str) -> str | None:
    """
    Send document image to Groq Vision LLM and extract expiry date.
    """
    doc_prompts = {
        "insurance": (
            "This is a vehicle insurance certificate. "
            "Find the policy END date — it may appear as: "
            "'Policy Period: From DD-MM-YYYY to DD-MM-YYYY', "
            "'Valid Upto', 'Expiry Date', or 'Policy Expiry'. "
            "Extract the LAST/END date from the policy period range, not the start date. "
            "Return ONLY that date in YYYY-MM-DD format. "
            "If you cannot find it, return NOT_FOUND."
        ),
        "rc": (
            "This is an Indian vehicle Registration Certificate (RC). "
            "Private vehicles in India have LIFETIME fitness validity, so there is no fitness expiry date. "
            "Instead, find the 'Tax Paid up to' date or 'Road Tax validity' date. "
            "Return ONLY that date in YYYY-MM-DD format. "
            "If you cannot find any date, return NOT_FOUND."
        ),
        "puc": (
            "This is a Pollution Under Control (PUC) certificate. "
            "Find and extract the 'Valid Upto' or expiry date. "
            "Return ONLY the date in YYYY-MM-DD format. "
            "If you cannot find it, return NOT_FOUND."
        ),
    }

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
        )

        content = [
            {"type": "text", "text": doc_prompts[doc_type]},
            {"type": "image_url", "image_url": {"url": image_b64}},
        ]

        response = await llm.ainvoke([HumanMessage(content=content)])
        extracted = response.content.strip()

        logger.info("Groq raw response for %s: %r", doc_type, extracted)

        if extracted == "NOT_FOUND" or not extracted:
            logger.warning("LLM returned NOT_FOUND for doc_type=%s", doc_type)
            return None

        date.fromisoformat(extracted)
        return extracted

    except Exception as e:
        logger.error("LLM extraction failed for doc_type=%s: %s", doc_type, e, exc_info=True)
        return None


async def fetch_documents(state: VehicleDocState) -> dict:
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            row = await conn.fetchrow(
                "SELECT insurance_url, rc_url, puc_url FROM vehicles WHERE vehicle_id = $1",
                state["vehicle_id"],
            )
            if not row:
                return {"error": f"Vehicle {state['vehicle_id']} not found"}
            if not row["insurance_url"] or not row["rc_url"] or not row["puc_url"]:
                return {"error": "One or more document URLs missing from vehicle record"}

            logger.info(
                "Fetched document URLs for vehicle %s — insurance=%s rc=%s puc=%s",
                state["vehicle_id"], row["insurance_url"], row["rc_url"], row["puc_url"],
            )
            return {
                "insurance_url": row["insurance_url"],
                "rc_url": row["rc_url"],
                "puc_url": row["puc_url"],
            }
        finally:
            await conn.close()
    except Exception as e:
        logger.error("fetch_documents failed: %s", e, exc_info=True)
        return {"error": f"Database error: {str(e)}"}


async def extract_insurance(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    logger.info("Extracting insurance expiry from: %s", state["insurance_url"])
    image_b64 = _pdf_url_to_base64_image(state["insurance_url"])
    if not image_b64:
        return {"insurance_expiry_date": None}
    expiry = await _extract_date_from_doc_image(image_b64, "insurance")
    logger.info("insurance_expiry_date = %s", expiry)
    return {"insurance_expiry_date": expiry}


async def extract_rc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    logger.info("Extracting RC date from: %s", state["rc_url"])
    image_b64 = _pdf_url_to_base64_image(state["rc_url"])
    if not image_b64:
        return {"rc_expiry_date": None}
    expiry = await _extract_date_from_doc_image(image_b64, "rc")
    logger.info("rc_expiry_date (tax paid up to) = %s", expiry)
    return {"rc_expiry_date": expiry}


async def extract_puc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    logger.info("Extracting PUC expiry from: %s", state["puc_url"])
    image_b64 = _pdf_url_to_base64_image(state["puc_url"])
    if not image_b64:
        return {"puc_expiry_date": None}
    expiry = await _extract_date_from_doc_image(image_b64, "puc")
    logger.info("puc_expiry_date = %s", expiry)
    return {"puc_expiry_date": expiry}


async def validate_results(state: VehicleDocState) -> dict:
    found = sum([
        state.get("insurance_expiry_date") is not None,
        state.get("rc_expiry_date") is not None,
        state.get("puc_expiry_date") is not None,
    ])
    logger.info(
        "validate_results: insurance=%s rc=%s puc=%s found=%d/3",
        state.get("insurance_expiry_date"),
        state.get("rc_expiry_date"),
        state.get("puc_expiry_date"),
        found,
    )
    if found == 0:
        return {"success": False, "error": "Could not extract any expiry dates from documents"}
    return {"success": True}


workflow = StateGraph(VehicleDocState)
workflow.add_node("fetch_documents", fetch_documents)
workflow.add_node("extract_insurance", extract_insurance)
workflow.add_node("extract_rc", extract_rc)
workflow.add_node("extract_puc", extract_puc)
workflow.add_node("validate_results", validate_results)

workflow.set_entry_point("fetch_documents")
workflow.add_edge("fetch_documents", "extract_insurance")
workflow.add_edge("extract_insurance", "extract_rc")
workflow.add_edge("extract_rc", "extract_puc")
workflow.add_edge("extract_puc", "validate_results")
workflow.add_edge("validate_results", END)

compiled_graph = workflow.compile()


def run_vehicle_doc_agent(vehicle_id: str) -> dict:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    initial_state = VehicleDocState(
        vehicle_id=vehicle_id,
        insurance_url=None,
        rc_url=None,
        puc_url=None,
        insurance_expiry_date=None,
        rc_expiry_date=None,
        puc_expiry_date=None,
        error=None,
        success=False,
    )
    result = asyncio.run(compiled_graph.ainvoke(initial_state))
    return dict(result)