import asyncio
import asyncpg
import json
from typing import TypedDict
from langgraph.graph import StateGraph, END

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from src.config.settings import settings
from src.data.clients.s3_client import s3_client


class DamageState(TypedDict):
    booking_id: str
    pre_rental_urls: list[str] | None
    post_rental_urls: list[str] | None
    pre_base64: list[str] | None
    post_base64: list[str] | None
    classification: str | None
    reasoning: str | None
    error: str | None
    success: bool


async def fetch_images(state: DamageState) -> dict:
    """Fetch image URLs from DB, download from S3 using AWS credentials, encode as base64."""
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            row = await conn.fetchrow(
                "SELECT pre_rental_image_urls, post_rental_image_urls FROM damage_logs WHERE booking_id = $1",
                state["booking_id"],
            )
            if not row:
                return {"error": f"Damage log not found for booking {state['booking_id']}"}

            pre_urls = list(row["pre_rental_image_urls"] or [])
            post_urls = list(row["post_rental_image_urls"] or [])

            if not pre_urls or not post_urls:
                return {"error": "Missing pre or post rental images"}

            # Take max 5 from each (Groq limit is 5 per request)
            pre_sample = pre_urls[:5]
            post_sample = post_urls[:5]

            # Download via boto3 — bypasses private bucket restriction
            pre_b64 = [b for url in pre_sample if (b := s3_client.download_as_base64(url))]
            post_b64 = [b for url in post_sample if (b := s3_client.download_as_base64(url))]

            if not pre_b64:
                return {"error": "Failed to download pre-rental images from S3"}
            if not post_b64:
                return {"error": "Failed to download post-rental images from S3"}

            return {
                "pre_rental_urls": pre_urls,
                "post_rental_urls": post_urls,
                "pre_base64": pre_b64,
                "post_base64": post_b64,
            }
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database error: {str(e)}"}


async def analyze_images(state: DamageState) -> dict:
    """3-pass analysis: describe pre, describe post, compare and classify."""
    if state.get("error"):
        return {}

    pre_b64 = state.get("pre_base64") or []
    post_b64 = state.get("post_base64") or []

    if not pre_b64 or not post_b64:
        return {"error": "No images available for analysis", "success": False}

    try:
        vision_llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
        )

        # Pass 1 — describe pre-rental condition
        pre_content = [{"type": "text", "text": (
            "You are a vehicle inspector. These are PRE-RENTAL photos of a car. "
            "Describe the visible condition — note any scratches, dents, stains, or damage. "
            "Be specific and factual. Plain text only."
        )}]
        for b64 in pre_b64:
            pre_content.append({"type": "image_url", "image_url": {"url": b64}})

        pre_response = await vision_llm.ainvoke([HumanMessage(content=pre_content)])
        pre_condition = pre_response.content

        # Pass 2 — describe post-rental condition
        post_content = [{"type": "text", "text": (
            "You are a vehicle inspector. These are POST-RENTAL photos of a car. "
            "Describe the visible condition — note any scratches, dents, stains, or damage. "
            "Be specific and factual. Plain text only."
        )}]
        for b64 in post_b64:
            post_content.append({"type": "image_url", "image_url": {"url": b64}})

        post_response = await vision_llm.ainvoke([HumanMessage(content=post_content)])
        post_condition = post_response.content

        # Pass 3 — compare and classify
        text_llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        compare_prompt = f"""You are a vehicle damage assessor. Compare the pre-rental and post-rental condition reports below.

PRE-RENTAL CONDITION:
{pre_condition}

POST-RENTAL CONDITION:
{post_condition}

Classify as exactly one of:
- Green: No new damage detected.
- Amber: Minor new damage (small scratches, light scuffs) — requires review.
- Red: Significant new damage (dents, deep scratches, broken parts) — hold deposit.

Respond ONLY with valid JSON:
{{"classification": "Green", "reasoning": "Brief explanation"}}"""

        compare_response = await text_llm.ainvoke([HumanMessage(content=compare_prompt)])
        result = json.loads(compare_response.content)

        return {
            "classification": result.get("classification", "needs_review"),
            "reasoning": result.get("reasoning", ""),
            "success": True,
        }

    except Exception as e:
        return {"error": f"Vision API error: {str(e)}", "success": False}


async def classify_output(state: DamageState) -> dict:
    if state.get("error"):
        return {"classification": "needs_review", "success": False}
    if state.get("classification") not in ["Green", "Amber", "Red"]:
        return {"classification": "needs_review"}
    return {}


workflow = StateGraph(DamageState)
workflow.add_node("fetch_images", fetch_images)
workflow.add_node("analyze_images", analyze_images)
workflow.add_node("classify_output", classify_output)
workflow.set_entry_point("fetch_images")
workflow.add_edge("fetch_images", "analyze_images")
workflow.add_edge("analyze_images", "classify_output")
workflow.add_edge("classify_output", END)

compiled_graph = workflow.compile()


def run_damage_agent(booking_id: str) -> dict:
    initial_state = DamageState(
        booking_id=booking_id,
        pre_rental_urls=None,
        post_rental_urls=None,
        pre_base64=None,
        post_base64=None,
        classification=None,
        reasoning=None,
        error=None,
        success=False,
    )
    result = asyncio.run(compiled_graph.ainvoke(initial_state))
    return dict(result)