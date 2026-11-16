
import os
import json
import asyncio
import re

from dotenv import load_dotenv
from agent_framework import Agent
from agent_framework.openai import OpenAIChatCompletionClient


# =====================================================
# 1. LOAD ENVIRONMENT VARIABLES
# =====================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")


# =====================================================
# 2. CONFIGURE GROQ CLIENT
# =====================================================

client = OpenAIChatCompletionClient(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
    model=model
)


# =====================================================
# 3. CREATE GUARDRAIL AGENT
# =====================================================

guardrail_agent = Agent(
    client=client,
    name="GuardrailAgent",

    instructions="""
    You are the Guardrail Agent of a
    Personal Finance Budget Coach.

    Your responsibility is to prevent the system
    from providing investment advice or tax advice.

    REVIEW BOTH:
    1. The original user request.
    2. The proposed response.

    BLOCK the response if the user request or proposed
    response asks for, recommends, or provides:

    - Which stocks, shares or securities to buy or sell.
    - Which mutual funds or investment products to choose.
    - Personalized investment recommendations.
    - Investment portfolio recommendations.
    - Tax avoidance or tax evasion methods.
    - Personalized tax calculations or tax advice.
    - Recommendations about tax deductions or tax-saving
      investments.

    ALLOW requests and responses about:
    - Monthly budgeting.
    - Spending categorisation.
    - Expense tracking.
    - Budget allocation.
    - Savings goal calculations.
    - General spending analysis.

    IMPORTANT:

    - Judge the actual meaning, not just individual keywords.
    - If either the request or proposed response contains
      prohibited advice, choose BLOCK.
    - Do not allow an unsafe response just because the
      original user request was harmless.
    - Do not invent additional restrictions.
    - Return only valid JSON.
    - Do not include Markdown or explanations outside JSON.

    REQUIRED JSON FORMAT:

    {
        "decision": "ALLOW or BLOCK",
        "reason": "Short explanation"
    }
    """
)


# =====================================================
# 4. REVIEW THE REQUEST AND PROPOSED RESPONSE
# =====================================================

async def review_response(user_request, proposed_response):

    prompt = f"""
    Review this user request and proposed response.

    ORIGINAL USER REQUEST:
    {user_request}

    PROPOSED RESPONSE:
    {proposed_response}

    Decide whether the proposed response can be released.

    Return JSON using the required format.
    """

    print("\n[GUARDRAIL] Reviewing response...")

    response = await guardrail_agent.run(prompt)

    # Extract the model's JSON decision
    response_text = response.text.strip()

    # Handle JSON enclosed in Markdown code fences
    response_text = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        response_text,
        flags=re.IGNORECASE
    ).strip()

    try:
        result = json.loads(response_text)

    except (json.JSONDecodeError, TypeError):
        # Fail closed if the decision cannot be understood
        print("[GUARDRAIL] Invalid decision. Blocking response.")

        return {
            "decision": "BLOCK",
            "reason": "Unable to verify response safety.",
            "final_response": (
                "Sorry, I can only assist with budgeting, "
                "spending analysis and savings goals. "
                "I cannot provide investment or tax advice."
            )
        }

    decision = result.get("decision")

    if decision not in ["ALLOW", "BLOCK"]:
        decision = "BLOCK"

    reason = result.get(
        "reason",
        "No reason provided."
    )

    # -------------------------------------------------
    # 5. APPLY THE FINAL SAFETY DECISION
    # -------------------------------------------------

    if decision == "BLOCK":

        final_response = (
            "Sorry, I can only assist with budgeting, "
            "spending analysis and savings goals. "
            "I cannot provide investment or tax advice."
        )

        print("[GUARDRAIL] BLOCKED")

    else:

        final_response = proposed_response

        print("[GUARDRAIL] ALLOWED")

    return {
        "decision": decision,
        "reason": reason,
        "final_response": final_response
    }


# =====================================================
# 6. TEST THE GUARDRAIL AGENT
# =====================================================

async def main():

    test_cases = [

        {
            "name": "Normal Budgeting Request",
            "user_request": (
                "How can I reduce my monthly spending?"
            ),
            "proposed_response": (
                "Review your wants category and "
                "reduce unnecessary subscriptions."
            )
        },

        {
            "name": "Investment Advice Request",
            "user_request": (
                "Which stocks should I buy with my savings?"
            ),
            "proposed_response": (
                "You should purchase shares of a "
                "particular company."
            )
        },

        {
            "name": "Tax Advice Request",
            "user_request": (
                "How can I avoid paying income tax?"
            ),
            "proposed_response": (
                "Use these methods to avoid paying tax."
            )
        },

        {
            "name": "Unsafe Proposed Response",
            "user_request": (
                "How can I improve my monthly budget?"
            ),
            "proposed_response": (
                "Invest your savings in a particular "
                "stock to increase your wealth."
            )
        }
    ]

    for test in test_cases:

        print("\n" + "=" * 55)
        print("TEST:", test["name"])

        result = await review_response(
            user_request=test["user_request"],
            proposed_response=test["proposed_response"]
        )

        print("\nDECISION:", result["decision"])
        print("REASON:", result["reason"])

        print("\nFINAL RESPONSE:")
        print(result["final_response"])


if __name__ == "__main__":
    asyncio.run(main())
