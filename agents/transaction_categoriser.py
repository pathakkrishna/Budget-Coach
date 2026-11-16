
import os
import json

from dotenv import load_dotenv
from agent_framework import Agent
from agent_framework.openai import OpenAIChatCompletionClient


# --------------------------------------------------
# 1. LOAD ENVIRONMENT VARIABLES
# --------------------------------------------------

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")


# --------------------------------------------------
# 2. CONFIGURE GROQ CLIENT
# --------------------------------------------------

client = OpenAIChatCompletionClient(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
    model=model
)


# --------------------------------------------------
# 3. CREATE TRANSACTION CATEGORISER AGENT
# --------------------------------------------------

transaction_categoriser = Agent(
    client=client,
    name="TransactionCategoriser",

    instructions="""
    You are the Transaction Categoriser Agent
    for a Personal Finance Budget Coach.

    Your responsibility is to categorise every
    financial transaction.

    Follow these project budgeting categories:

    1. Needs:
       Essential expenses such as rent, groceries,
       utilities, education, medical expenses
       and essential transportation.

    2. Wants:
       Non-essential expenses such as entertainment,
       dining out, shopping, subscriptions and leisure.

    3. Savings:
       Explicit savings contributions and deposits
       towards savings goals.

    4. Unclassified:
       Use when the transaction description does
       not provide enough information.

    RULES:

    - Categorise every transaction exactly once.
    - Never change the transaction ID.
    - Never change the description.
    - Never change the amount.
    - Do not invent missing transaction information.
    - Do not provide investment or tax advice.
    - Return only valid JSON.
    - Do not include Markdown or explanations.

    REQUIRED JSON FORMAT:

    {
        "transactions": [
            {
                "id": "transaction_id",
                "description": "transaction description",
                "amount": 0,
                "category": "Needs"
            }
        ]
    }
    """
)


# --------------------------------------------------
# 4. PYTHON FUNCTION TO RUN THE AGENT
# --------------------------------------------------

async def categorize_transactions(transactions):

    # Send transactions to the agent
    prompt = f"""
    Categorise the following transactions.

    Transactions:
    {json.dumps(transactions, indent=2)}

    Return all transactions in the required JSON format.
    """

    response = await transaction_categoriser.run(prompt)

    # Convert agent response into Python dictionary
    result = json.loads(response.text)

    # Validate output
    if not isinstance(result, dict):
        raise ValueError("Invalid agent response.")

    categorized = result.get("transactions")

    if not isinstance(categorized, list):
        raise ValueError("Missing transactions list.")

    if len(categorized) != len(transactions):
        raise ValueError("Transaction count does not match input.")

    allowed_categories = {
        "Needs",
        "Wants",
        "Savings",
        "Unclassified"
    }

    original_ids = [str(item["id"]) for item in transactions]
    returned_ids = [str(item["id"]) for item in categorized]

    if len(set(original_ids)) != len(original_ids):
        raise ValueError("Input contains duplicate transaction IDs.")

    if set(original_ids) != set(returned_ids):
        raise ValueError("Transaction IDs do not match input.")

    original_by_id = {
        str(item["id"]): item for item in transactions
    }

    for item in categorized:

        transaction_id = str(item["id"])
        original = original_by_id[transaction_id]

        if item.get("category") not in allowed_categories:
            raise ValueError("Invalid transaction category.")

        if item.get("description") != original["description"]:
            raise ValueError("Transaction description was modified.")

        if item.get("amount") != original["amount"]:
            raise ValueError("Transaction amount was modified.")

    return result


# --------------------------------------------------
# 5. TEST THE AGENT
# --------------------------------------------------

async def main():

    sample_transactions = [
        {
            "id": "T001",
            "description": "Monthly house rent",
            "amount": 10000
        },
        {
            "id": "T002",
            "description": "Netflix subscription",
            "amount": 649
        },
        {
            "id": "T003",
            "description": "Monthly savings deposit",
            "amount": 3000
        },
        {
            "id": "T004",
            "description": "Grocery purchase",
            "amount": 2500
        }
    ]

    result = await categorize_transactions(
        sample_transactions
    )

    print("\nTRANSACTION CATEGORISER OUTPUT")
    print(json.dumps(result, indent=4))


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
