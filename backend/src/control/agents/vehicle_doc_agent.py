from __future__ import annotations

import asyncio
import io
from datetime import date
from typing import TypedDict

import asyncpg
import httpx
from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

from src.config.settings import settings


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


async def _extract_text_from_pdf_url(url: str) -> str:
    try:
        from pypdf import PdfReader
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url)
            r.raise_for_status()
        reader = PdfReader(io.BytesIO(r.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        return text.strip() or "No text could be extracted."
    except Exception as e:
        return f"PDF extraction error: {e}"


def _build_llm() -> ChatGroq:
    return ChatGroq(api_key=settings.groq_api_key, model="llama-3.3-70b-versatile", temperature=0.0)


async def _ask_llm_for_date(llm: ChatGroq, doc_label: str, text: str) -> str | None:
    prompt = (
        f"You are a document parser. Extract the {doc_label} expiry date from the text below.\n"
        f"Return ONLY the date in YYYY-MM-DD format. If not found, return NOT_FOUND.\n\n"
        f"Document text:\n{text[:3000]}\n\nExpiry date (YYYY-MM-DD only):"
    )
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    extracted = response.content.strip()
    if extracted == "NOT_FOUND" or len(extracted) != 10:
        return None
    date.fromisoformat(extracted)  # raises if invalid
    return extracted


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
            if not (row["insurance_url"] and row["rc_url"] and row["puc_url"]):
                return {"error": "One or more document URLs missing from vehicle record"}
            return {"insurance_url": row["insurance_url"], "rc_url": row["rc_url"], "puc_url": row["puc_url"]}
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database error: {e}"}


async def extract_insurance(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["insurance_url"])
        result = await _ask_llm_for_date(_build_llm(), "insurance policy", text)
        return {"insurance_expiry_date": result}
    except Exception:
        return {"insurance_expiry_date": None}


async def extract_rc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["rc_url"])
        result = await _ask_llm_for_date(_build_llm(), "vehicle registration (RC)", text)
        return {"rc_expiry_date": result}
    except Exception:
        return {"rc_expiry_date": None}


async def extract_puc(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {}
    try:
        text = await _extract_text_from_pdf_url(state["puc_url"])
        result = await _ask_llm_for_date(_build_llm(), "PUC (Pollution Under Control) certificate", text)
        return {"puc_expiry_date": result}
    except Exception:
        return {"puc_expiry_date": None}


async def validate_results(state: VehicleDocState) -> dict:
    if state.get("error"):
        return {"success": False}
    found = sum([
        state.get("insurance_expiry_date") is not None,
        state.get("rc_expiry_date") is not None,
        state.get("puc_expiry_date") is not None,
    ])
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
    initial_state = VehicleDocState(
        vehicle_id=vehicle_id,
        insurance_url=None, rc_url=None, puc_url=None,
        insurance_expiry_date=None, rc_expiry_date=None, puc_expiry_date=None,
        error=None, success=False,
    )
    return dict(asyncio.run(compiled_graph.ainvoke(initial_state)))
