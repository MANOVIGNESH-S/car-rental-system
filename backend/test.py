import asyncio
import base64
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from src.config.settings import settings


def image_to_base64_url(image_path: str) -> str:
    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    ext = Path(image_path).suffix.lower().replace(".", "")
    mime = "image/jpeg" if ext in ["jpg", "jpeg"] else "image/png"
    return f"data:{mime};base64,{data}"


async def test_damage_llm(
    pre_images: list[str],
    post_images: list[str],
) -> None:
    print(f"\nPre images : {len(pre_images)}")
    print(f"Post images: {len(post_images)}\n")

    vision_llm = ChatGroq(
        api_key=settings.groq_api_key,
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        temperature=0.0,
    )

    print("--- Pass 1: Analysing pre-rental condition ---")
    pre_content = [
        {
            "type": "text",
            "text": (
                "You are a vehicle inspector. These are PRE-RENTAL photos of a car "
                "(front, rear, left side, right side, dashboard). "
                "Describe the visible condition in detail — note any existing scratches, "
                "dents, stains, or damage. Be specific and factual. Plain text, no JSON."
            ),
        }
    ]
    for path in pre_images:
        pre_content.append({
            "type": "image_url",
            "image_url": {"url": image_to_base64_url(path)},
        })

    pre_response = await vision_llm.ainvoke([HumanMessage(content=pre_content)])
    pre_condition = pre_response.content
    print(pre_condition)

    print("\n--- Pass 2: Analysing post-rental condition ---")
    post_content = [
        {
            "type": "text",
            "text": (
                "You are a vehicle inspector. These are POST-RENTAL photos of a car "
                "(front, rear, left side, right side, dashboard). "
                "Describe the visible condition in detail — note any scratches, "
                "dents, stains, or damage. Be specific and factual. Plain text, no JSON."
            ),
        }
    ]
    for path in post_images:
        post_content.append({
            "type": "image_url",
            "image_url": {"url": image_to_base64_url(path)},
        })

    post_response = await vision_llm.ainvoke([HumanMessage(content=post_content)])
    post_condition = post_response.content
    print(post_condition)

    print("\n--- Pass 3: Comparing and classifying ---")
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

    print(f"\n{'='*50}")
    print(f"CLASSIFICATION : {result.get('classification')}")
    print(f"REASONING      : {result.get('reasoning')}")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    # Put your image paths here
    # Use same image for pre and post to test Green
    # Use different images to test Amber/Red

    PRE_IMAGES = [
        "test_images/b1.jpg",
        "test_images/b2.jpg",
        "test_images/b3.jpg",
        "test_images/b4.jpg",
        "test_images/Dashboard.jpg",   # png is fine
    ]

    POST_IMAGES = [
        "test_images/a1.jpg",
        "test_images/a2.jpg",
        "test_images/a3.jpg",
        "test_images/a4.jpg",
        "test_images/a5.png",  # ⚠️ case-sensitive
    ]

    asyncio.run(test_damage_llm(PRE_IMAGES, POST_IMAGES))