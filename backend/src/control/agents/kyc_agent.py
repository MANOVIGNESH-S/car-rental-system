import asyncio
import asyncpg
import json
from typing import TypedDict, Optional, Dict, Any
from langgraph.graph import StateGraph, END

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from src.config.settings import settings
from src.data.clients.s3_client import s3_client


def _url_to_s3_key(url: str) -> str:
    parts = url.split(".amazonaws.com/", 1)
    return parts[1] if len(parts) == 2 else url


# -------------------------
# 1. STATE
# -------------------------
class KYCState(TypedDict):
    user_id: str
    license_url: Optional[str]
    selfie_url: Optional[str]
    extracted_address: Optional[str]
    dl_expiry_date: Optional[str]
    face_match_score: Optional[float]
    kyc_decision: Optional[str]
    error: Optional[str]
    success: bool


# -------------------------
# 2. FETCH DOCUMENTS
# -------------------------
async def fetch_documents(state: KYCState) -> Dict[str, Any]:
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            row = await conn.fetchrow(
                "SELECT license_url, selfie_url FROM users WHERE user_id = $1",
                state["user_id"]
            )
            if not row:
                return {"error": f"User {state['user_id']} not found"}

            return {
                "license_url": s3_client.generate_presigned_url(
                    _url_to_s3_key(row["license_url"]), expires_in=900
                ),
                "selfie_url": s3_client.generate_presigned_url(
                    _url_to_s3_key(row["selfie_url"]), expires_in=900
                ),
            }
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database error: {str(e)}"}


# -------------------------
# 3. VALIDATE DOCUMENT TYPES (Swap Detection)
# -------------------------
async def validate_document_types(state: KYCState) -> Dict[str, Any]:
    if state.get("error"):
        return {}

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

        content = [
            {
                "type": "text",
                "text": (
                    "You are given two images.\n"
                    "Image 1 should be a driving licence (ID card).\n"
                    "Image 2 should be a human selfie.\n\n"
                    "Classify each strictly as 'id_card' or 'selfie'.\n"
                    "Respond ONLY JSON:\n"
                    "{\"image1_type\": \"id_card|selfie\", \"image2_type\": \"id_card|selfie\"}"
                )
            },
            {"type": "image_url", "image_url": {"url": state["license_url"]}},
            {"type": "image_url", "image_url": {"url": state["selfie_url"]}},
        ]

        response = await llm.ainvoke([HumanMessage(content=content)])
        data = json.loads(response.content)

        img1 = data.get("image1_type", "").lower()
        img2 = data.get("image2_type", "").lower()

        # 🚨 Swap detected
        if img1 == "selfie" and img2 == "id_card":
            return {
                "error": "Documents are swapped (DL ↔ Selfie). Please re-upload correctly.",
                "kyc_decision": "failed",
                "success": False,
            }

        # ❌ Wrong DL
        if img1 != "id_card":
            return {
                "error": "Invalid DL image. Please upload a valid driving license.",
                "kyc_decision": "failed",
                "success": False,
            }

        # ❌ Wrong Selfie
        if img2 != "selfie":
            return {
                "error": "Invalid selfie image. Please upload a clear face photo.",
                "kyc_decision": "failed",
                "success": False,
            }

        return {}

    except Exception as e:
        # non-blocking fallback
        return {"error": f"Validation warning: {str(e)}"}


# -------------------------
# 4. COMBINED OCR + FACE MATCH (FAST)
# -------------------------
async def analyse_documents(state: KYCState) -> Dict[str, Any]:
    if state.get("error"):
        return {}

    try:
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

        content = [
            {
                "type": "text",
                "text": (
                    "You are given TWO images:\n"
                    "Image 1: Driving License\n"
                    "Image 2: Selfie\n\n"
                    
                    "TASKS:\n"
                    "1. Extract full address\n"
                    "2. Extract expiry date (YYYY-MM-DD)\n"
                    "3. Compare faces → similarity score (0.0–1.0)\n\n"
                    
                    "RULES:\n"
                    "- If unclear, return null\n"
                    "- Be accurate\n\n"
                    
                    "Respond ONLY JSON:\n"
                    "{"
                    "\"extracted_address\": \"...\","
                    "\"dl_expiry_date\": \"YYYY-MM-DD or null\","
                    "\"face_match_score\": 0.0"
                    "}"
                )
            },
            {"type": "image_url", "image_url": {"url": state["license_url"]}},
            {"type": "image_url", "image_url": {"url": state["selfie_url"]}},
        ]

        response = await llm.ainvoke([HumanMessage(content=content)])
        data = json.loads(response.content)

        return {
            "extracted_address": data.get("extracted_address"),
            "dl_expiry_date": data.get("dl_expiry_date"),
            "face_match_score": float(data.get("face_match_score", 0.0)),
        }

    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}


# -------------------------
# 5. FINAL CLASSIFICATION
# -------------------------
async def classify(state: KYCState) -> Dict[str, Any]:

    # Already failed earlier
    if state.get("kyc_decision") == "failed":
        return {"kyc_decision": "failed", "success": False}

    if state.get("error"):
        return {"kyc_decision": "failed", "success": False}

    # 🚨 Extra validation (important)
    if not state.get("extracted_address"):
        return {"kyc_decision": "failed", "success": False}

    # 🚨 Reject expired driving license — verified badge must not show for expired DL
    dl_expiry = state.get("dl_expiry_date")
    if dl_expiry:
        try:
            from datetime import date
            expiry = date.fromisoformat(dl_expiry)
            if expiry < date.today():
                return {
                    "kyc_decision": "failed",
                    "success": False,
                    "error": f"Driving license expired on {dl_expiry}. Please upload a renewed license.",
                }
        except ValueError:
            pass  # If we can't parse the date, don't block — let the score decide

    # Score thresholds (face_match_score is 0.0–1.0):
    #   < 0.10  → failed
    #   0.10–0.89 → needs_review
    #   ≥ 0.90  → verified
    score = state.get("face_match_score", 0.0)

    if score >= 0.90:
        return {"kyc_decision": "verified", "success": True}
    elif score >= 0.10:
        return {"kyc_decision": "needs_review", "success": True}
    else:
        return {"kyc_decision": "failed", "success": False}


# -------------------------
# 6. WORKFLOW
# -------------------------
workflow = StateGraph(KYCState)

workflow.add_node("fetch_documents", fetch_documents)
workflow.add_node("validate_document_types", validate_document_types)
workflow.add_node("analyse_documents", analyse_documents)
workflow.add_node("classify", classify)

workflow.set_entry_point("fetch_documents")

workflow.add_edge("fetch_documents", "validate_document_types")
workflow.add_edge("validate_document_types", "analyse_documents")
workflow.add_edge("analyse_documents", "classify")
workflow.add_edge("classify", END)

compiled_graph = workflow.compile()


# -------------------------
# 7. RUN FUNCTION
# -------------------------
def run_kyc_agent(user_id: str) -> dict:
    initial_state = KYCState(
        user_id=user_id,
        license_url=None,
        selfie_url=None,
        extracted_address=None,
        dl_expiry_date=None,
        face_match_score=None,
        kyc_decision=None,
        error=None,
        success=False,
    )

    result = asyncio.run(compiled_graph.ainvoke(initial_state))
    return dict(result)