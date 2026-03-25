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
    """Extract S3 key from a stored S3 URL."""
    # URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
    parts = url.split(".amazonaws.com/", 1)
    return parts[1] if len(parts) == 2 else url

# 1. State TypedDict
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

# 2. Node implementations
async def fetch_documents(state: KYCState) -> Dict[str, Any]:
    """Fetches license_url and selfie_url from DB, converts to presigned URLs for Groq access."""
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            query = "SELECT license_url, selfie_url FROM users WHERE user_id = $1"
            row = await conn.fetchrow(query, state["user_id"])
            if not row:
                return {"error": f"User {state['user_id']} not found"}

            license_key = _url_to_s3_key(row["license_url"])
            selfie_key = _url_to_s3_key(row["selfie_url"])

            # Generate presigned URLs valid for 15 min so Groq can fetch them
            license_presigned = await s3_client.generate_presigned_url(license_key, expires_in=900)
            selfie_presigned = await s3_client.generate_presigned_url(selfie_key, expires_in=900)

            return {"license_url": license_presigned, "selfie_url": selfie_presigned}
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database error: {str(e)}"}

async def run_ocr(state: KYCState) -> Dict[str, Any]:
    """Uses LangChain ChatGroq with Llama 4 Scout Vision to extract ID text."""
    if state.get("error"): return {}
    if not state.get("license_url"): return {"error": "License URL not found"}

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
                "text": "Extract the home address and the expiry date (format YYYY-MM-DD) from this driver's license. Respond ONLY with JSON: {'extracted_address': '...', 'dl_expiry_date': '...'}"
            },
            {"type": "image_url", "image_url": {"url": state["license_url"]}}
        ]
        
        message = HumanMessage(content=content)
        response = await llm.ainvoke([message])
        
        data = json.loads(response.content)
        return {
            "extracted_address": data.get("extracted_address"),
            "dl_expiry_date": data.get("dl_expiry_date")
        }
    except Exception as e:
        return {"error": f"OCR failed: {str(e)}"}

async def run_face_match(state: KYCState) -> Dict[str, Any]:
    """Uses LangChain ChatGroq with Llama 4 Scout Vision to compare ID face vs Selfie."""
    if state.get("error"): return {}
    if not state.get("selfie_url"): return {"face_match_score": 0.0}

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
                "text": "Compare the face in the ID card to the live selfie. Give a similarity score between 0.0 and 1.0, where 1.0 is an exact match. Ignore lighting and angles. Respond ONLY with JSON: {'face_match_score': 0.95}"
            },
            {"type": "image_url", "image_url": {"url": state["license_url"]}},
            {"type": "image_url", "image_url": {"url": state["selfie_url"]}}
        ]
        
        message = HumanMessage(content=content)
        response = await llm.ainvoke([message])
        
        data = json.loads(response.content)
        return {"face_match_score": float(data.get("face_match_score", 0.0))}
    except Exception as e:
        return {"face_match_score": 0.0, "error": f"Face match warning: {str(e)}"}

async def classify(state: KYCState) -> Dict[str, Any]:
    """Calculates final decision based on LLM outputs."""
    if state.get("error") and not state.get("extracted_address"):
        return {"kyc_decision": "failed", "success": False}

    score = state.get("face_match_score", 0.0)
    
    if score >= 0.75: return {"kyc_decision": "verified", "success": True}
    elif score >= 0.5: return {"kyc_decision": "needs_review", "success": True}
    else: return {"kyc_decision": "failed", "success": False}

# 3. Build graph
workflow = StateGraph(KYCState)

workflow.add_node("fetch_documents", fetch_documents)
workflow.add_node("run_ocr", run_ocr)
workflow.add_node("run_face_match", run_face_match)
workflow.add_node("classify", classify)

workflow.set_entry_point("fetch_documents")
workflow.add_edge("fetch_documents", "run_ocr")
workflow.add_edge("run_ocr", "run_face_match")
workflow.add_edge("run_face_match", "classify")
workflow.add_edge("classify", END)

compiled_graph = workflow.compile()

# 4. Public function
def run_kyc_agent(user_id: str) -> dict:
    initial_state = KYCState(
        user_id=user_id, license_url=None, selfie_url=None,
        extracted_address=None, dl_expiry_date=None, face_match_score=None,
        kyc_decision=None, error=None, success=False,
    )
    result = asyncio.run(compiled_graph.ainvoke(initial_state))
    return dict(result)