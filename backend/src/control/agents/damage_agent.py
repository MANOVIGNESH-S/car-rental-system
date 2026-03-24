import asyncio
import asyncpg
import json
from typing import TypedDict
from langgraph.graph import StateGraph, END

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from src.config.settings import settings

# 1. State TypedDict
class DamageState(TypedDict):
    booking_id: str
    pre_rental_urls: list[str] | None
    post_rental_urls: list[str] | None
    classification: str | None
    reasoning: str | None
    error: str | None
    success: bool

# 2. Node implementations
async def fetch_images(state: DamageState) -> dict:
    """Fetches pre and post rental image URLs from the database."""
    try:
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(dsn)
        try:
            query = """
                SELECT pre_rental_image_urls, post_rental_image_urls 
                FROM damage_logs 
                WHERE booking_id = $1
            """
            row = await conn.fetchrow(query, state["booking_id"])
            if row:
                return {
                    "pre_rental_urls": row["pre_rental_image_urls"],
                    "post_rental_urls": row["post_rental_image_urls"]
                }
            return {"error": f"Damage logs not found for booking {state['booking_id']}"}
        finally:
            await conn.close()
    except Exception as e:
        return {"error": f"Database connection error: {str(e)}"}

async def analyze_images(state: DamageState) -> dict:
    """Uses LangChain ChatGroq with Llama 4 Scout Vision to assess damage."""
    if state.get("error"):
        return {}

    pre_urls = state.get("pre_rental_urls", [])
    post_urls = state.get("post_rental_urls", [])

    if not pre_urls or not post_urls:
        return {"error": "Missing pre or post rental images", "success": False}

    try:
        # Initialize LangChain ChatGroq wrapper
        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0,
            model_kwargs={"response_format": {"type": "json_object"}}
        )
        
        # Build multimodal content array for LangChain
        content = [
            {
                "type": "text", 
                "text": """You are a highly precise vehicle damage inspector. 
                Compare the pre-rental images with the post-rental images. 
                Classify the damage as exactly one of: Green, Amber, Red.
                Green = No new damage detected.
                Amber = Minor new damage requiring review.
                Red = Significant new damage, hold deposit.
                
                Respond ONLY in valid JSON format like this:
                {"classification": "Amber", "reasoning": "Brief explanation of what changed"}"""
            }
        ]
        
        for url in pre_urls:
            content.append({"type": "image_url", "image_url": {"url": url}})
        for url in post_urls:
            content.append({"type": "image_url", "image_url": {"url": url}})

        # Create the HumanMessage and invoke the LLM asynchronously
        message = HumanMessage(content=content)
        response = await llm.ainvoke([message])

        # Parse the JSON response
        result_json = json.loads(response.content)
        
        return {
            "classification": result_json.get("classification", "needs_review"),
            "reasoning": result_json.get("reasoning", "No reasoning provided"),
            "success": True
        }
        
    except Exception as e:
        return {"error": f"Vision API error: {str(e)}", "success": False}

async def classify_output(state: DamageState) -> dict:
    """Validates classification output."""
    if state.get("error"):
        return {"classification": "needs_review", "success": False}

    valid_classes = ["Green", "Amber", "Red"]
    if state.get("classification") not in valid_classes:
        return {"classification": "needs_review"}
        
    return {}

# 3. Build graph
workflow = StateGraph(DamageState)

workflow.add_node("fetch_images", fetch_images)
workflow.add_node("analyze_images", analyze_images)
workflow.add_node("classify_output", classify_output)

workflow.set_entry_point("fetch_images")
workflow.add_edge("fetch_images", "analyze_images")
workflow.add_edge("analyze_images", "classify_output")
workflow.add_edge("classify_output", END)

compiled_graph = workflow.compile()

# 4. Public function
def run_damage_agent(booking_id: str) -> dict:
    initial_state = DamageState(
        booking_id=booking_id, pre_rental_urls=None, post_rental_urls=None,
        classification=None, reasoning=None, error=None, success=False,
    )
    result = asyncio.run(compiled_graph.ainvoke(initial_state))
    return dict(result)