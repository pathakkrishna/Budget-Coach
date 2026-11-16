
import os
import json

from dotenv import load_dotenv
from agent_framework import Agent, tool
from agent_framework.openai import OpenAIChatCompletionClient

from tools.budget_calculator import calculate_budget
from tools.guideline_retriever import retrieve_guidelines


# =====================================================
# 1. LOAD ENVIRONMENT VARIABLES
# =====================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv("GROQ_MODEL")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from .env")

if not model:
    raise ValueError("GROQ_MODEL is missing from .env")


# =====================================================
# 2. CONFIGURE GROQ CLIENT
# =====================================================

client = OpenAIChatCompletionClient(
    api_key=api_key,
    base_url="https://api.groq.com/openai/v1",
    model=model
)


# =====================================================
# 3. CREATE BUDGET CALCULATION TOOL
# =====================================================

@tool(approval_mode="never_require")
def calculate_budget_tool(
    monthly_income: float,
    transactions_json: str
) -> str:
    """
    Calculate monthly budget allocation and actual spending.

    monthly_income: User's monthly income in INR.
    transactions_json: JSON string containing categorised transactions.
    """

    print("\n[TOOL CALLED] calculate_budget_tool")

    transactions = json.loads(transactions_json)

    result = calculate_budget(
        monthly_income=monthly_income,
        transactions=transactions
    )

    return json.dumps(result)


# =====================================================
# 4. CREATE BUDGET RULE AGENT
# =====================================================

budget_rule_agent = Agent(
    client=client,
    name="BudgetRuleAgent",

    instructions="""
You are the Budget Rule Agent of a
Personal Finance Budget Coach.

Your responsibility is to analyse monthly income,
expenses and savings using the project's 50/30/20
budgeting guidelines.

BUDGET ALLOCATION:

- 50% of monthly income: Needs.
- 30% of monthly income: Wants.
- 20% of monthly income: Savings.

CURRENCY RULES:

- All monetary values are in Indian Rupees (INR).
- Always display money using ₹.
- Never use $, USD or another currency.

IMPORTANT RULES:

1. Use the retrieved budgeting guidelines.

2. Always call calculate_budget_tool for calculations.

3. Never calculate financial amounts yourself.

4. Do not change transaction amounts or categories.

5. Distinguish between monthly savings target
   and actual savings contributions.

6. The monthly savings target is 20% of monthly income.

7. Actual savings represent money the user has
   actually saved during the month.

8. Never treat the monthly savings target as
   an actual savings contribution.

9. A savings shortfall means actual savings
   are below the monthly savings target.

10. Do not add planned savings to a user's
    long-term savings balance.

11. Only actual confirmed savings contributions
    can be added to the long-term savings goal.

12. Do not provide investment or tax advice.

13. Never invent missing financial information.

REPORT REQUIREMENTS:

After receiving the calculation tool results,
explain the following:

1. Monthly income.
2. Needs budget and actual spending.
3. Wants budget and actual spending.
4. Monthly savings target.
5. Actual savings contributions.
6. Savings shortfall, if any.
7. Overspending alerts.
8. Unclassified transaction amount.

Clearly mention whether Needs and Wants are
within budget or overspending.

Clearly mention whether actual savings meet
the 20% savings target or have a shortfall.

Explain that actual savings contributions
can be added to the user's long-term savings goal
through the Savings Goal Agent.

Keep the explanation clear and concise.
Always use Indian Rupees (₹).
""",

    tools=[calculate_budget_tool]
)


# =====================================================
# 5. RUN BUDGET RULE AGENT
# =====================================================

async def run_budget_rule_agent(monthly_income, transactions):

    # -----------------------------------------------
    # A. RETRIEVE BUDGETING GUIDELINES
    # -----------------------------------------------

    query = """
    Explain the 50/30/20 budget allocation,
    Needs and Wants spending limits,
    monthly savings target, actual savings,
    overspending rules and savings shortfall.
    """

    guidelines = retrieve_guidelines(
        query=query,
        top_k=5
    )

    if not guidelines:
        raise ValueError(
            "No relevant budgeting guidelines retrieved."
        )

    retrieved_context = "\n\n".join(
        item["content"] for item in guidelines
    )

    print("\n[ RAG ] Retrieved budgeting guidelines:")

    for item in guidelines:
        print("-", item["heading"])

    # -----------------------------------------------
    # B. PREPARE AGENT INPUT
    # -----------------------------------------------

    prompt = f"""
Analyse the following monthly financial information.

MONTHLY INCOME:
₹{monthly_income:,.2f}

CATEGORISED TRANSACTIONS:
{json.dumps(transactions, indent=2)}

RETRIEVED BUDGETING GUIDELINES:
{retrieved_context}

TASK:

1. Call calculate_budget_tool exactly once.

2. Pass the supplied monthly income.

3. Pass all supplied categorised transactions
   as a JSON string.

4. Use the tool results to explain the analysis.

5. Clearly distinguish the monthly savings target
   from actual savings contributions.

6. Explain any savings shortfall.

7. Clearly state whether Needs and Wants are
   within budget or overspending.

8. Clearly state whether the savings target
   has been met or has a shortfall.

9. Do not invent missing information.

10. Display all monetary values using ₹.
"""

    # -----------------------------------------------
    # C. EXECUTE AGENT
    # -----------------------------------------------

    print("\n[AGENT] Budget Rule Agent is running...")

    response = await budget_rule_agent.run(prompt)

    return response.text
