import os
import json

from dotenv import load_dotenv
from agent_framework import Agent, tool
from agent_framework.openai import OpenAIChatCompletionClient

from tools.savings_calculator import calculate_savings_progress

from memory.savings_memory import (
    set_savings_goal,
    add_savings_contribution,
    get_savings_summary,
    get_savings_goal_history
)


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
# 3. CREATE SAVINGS GOAL TOOL
# =====================================================

@tool(approval_mode="never_require")
def set_savings_goal_tool(
    goal_amount: float,
    initial_savings: float
) -> str:
    """
    Create a new active savings goal.

    goal_amount: Target amount in INR.
    initial_savings: Savings accumulated before the current month.
    """

    print("\n[TOOL CALLED] set_savings_goal_tool")

    try:
        result = set_savings_goal(
            goal_amount=goal_amount,
            initial_savings=initial_savings
        )

        return json.dumps({
            "status": "success",
            "summary": result
        })

    except ValueError as error:
        return json.dumps({
            "status": "error",
            "message": str(error)
        })


# =====================================================
# 4. ADD ACTUAL SAVINGS CONTRIBUTION TOOL
# =====================================================

@tool(approval_mode="never_require")
def add_savings_contribution_tool(
    contribution_id: str,
    contribution_type: str,
    amount: float,
    description: str,
    month: str = ""
) -> str:
    """
    Add an actual savings contribution to the active savings goal.

    contribution_type:
        monthly - Actual savings from a particular month.
        manual  - Additional confirmed amount explicitly saved by the user.

    contribution_id: Unique ID to prevent duplicate entries.
    """

    print("\n[TOOL CALLED] add_savings_contribution_tool")

    try:
        result = add_savings_contribution(
            contribution_id=contribution_id,
            contribution_type=contribution_type,
            amount=amount,
            description=description,
            month=month if contribution_type == "monthly" else None
        )

        return json.dumps(result)

    except ValueError as error:
        return json.dumps({
            "status": "error",
            "message": str(error)
        })


# =====================================================
# 5. RETRIEVE SAVINGS SUMMARY TOOL
# =====================================================

@tool(approval_mode="never_require")
def get_savings_summary_tool() -> str:
    """
    Retrieve the current savings goal and cumulative progress
    from persistent SQLite memory.
    """

    print("\n[TOOL CALLED] get_savings_summary_tool")

    try:
        result = get_savings_summary()

        return json.dumps({
            "status": "success",
            "summary": result
        })

    except ValueError:
        return json.dumps({
            "status": "not_configured",
            "message": "No savings goal found."
        })


# =====================================================
# 6. RETRIEVE SAVINGS GOAL HISTORY TOOL
# =====================================================

@tool(approval_mode="never_require")
def get_savings_history_tool() -> str:
    """
    Retrieve all historical and completed savings goals from SQLite memory.
    """

    print("\n[TOOL CALLED] get_savings_history_tool")

    try:
        result = get_savings_goal_history()

        return json.dumps({
            "status": "success",
            "history": result
        })

    except Exception as error:
        return json.dumps({
            "status": "error",
            "message": str(error)
        })


# =====================================================
# 7. SAVINGS CALCULATION TOOL
# =====================================================

@tool(approval_mode="never_require")
def savings_calculation_tool(
    target_amount: float,
    current_savings: float
) -> str:
    """
    Calculate savings progress for a target amount.

    This tool performs calculations only and does not change database records.
    """

    print("\n[TOOL CALLED] savings_calculation_tool")

    try:
        result = calculate_savings_progress(
            target_amount=target_amount,
            current_savings=current_savings
        )

        return json.dumps(result)

    except ValueError as error:
        return json.dumps({
            "status": "error",
            "message": str(error)
        })


# =====================================================
# 8. CREATE SAVINGS GOAL AGENT
# =====================================================

savings_goal_agent = Agent(
    client=client,
    name="SavingsGoalAgent",

    instructions="""
You are the Savings Goal Agent of a
Personal Finance Budget Coach designed for users in India.

Your responsibility is to track, manage and report the user's
long-term savings goals and actual contributions stored persistently in SQLite.

PERSISTENT SAVINGS RULES:

1. Goals and contributions are persisted in SQLite.
2. Only one active goal exists at a time.
3. Completed goals and their contribution histories are preserved.
4. Once a goal is completed, no further contributions are permitted for it.
5. A user may create a new goal after completing their current goal.
6. Each contribution belongs to a specific goal.

CURRENCY RULES:

- All monetary values are in Indian Rupees.
- Always display amounts using the ₹ symbol (e.g., ₹25,000.00).
- Never convert amounts into another currency.

CRITICAL RULES:

1. Never invent savings amounts or targets.
2. Initial savings are the amount saved before the current contributions.
3. Only actual savings increase the savings balance.
4. Planned savings targets (e.g. 20% from 50/30/20) must NEVER be added
   to the savings balance.
5. Never record duplicate contributions.
6. DO NOT call add_savings_contribution_tool or set_savings_goal_tool
   when asked to report, review, summarize, or explain an existing goal.
   All monthly and manual contributions have already been recorded to the database.
7. Do not provide investment or tax advice.

REPORTING:

When summarizing savings progress, clearly explain:
- Goal target amount (₹)
- Initial savings (₹)
- Cumulative actual contributions (₹)
- Current savings balance (₹)
- Progress percentage (%)
- Remaining amount to reach the goal (₹)
- Goal status (ACTIVE or COMPLETED)
- If completed, celebrate the achievement and mention that they can set a new goal.

Keep responses clear, concise, encouraging and accurate.
Always format currency in Indian Rupees (₹).
""",

    tools=[
        set_savings_goal_tool,
        add_savings_contribution_tool,
        get_savings_summary_tool,
        get_savings_history_tool,
        savings_calculation_tool
    ]
)


# =====================================================
# 9. RUN SAVINGS GOAL AGENT
# =====================================================

async def run_savings_goal_agent(user_request: str) -> str:
    """Run the Savings Goal Agent with the user request."""

    print("\n[AGENT] Savings Goal Agent is running...")

    response = await savings_goal_agent.run(user_request)

    return response.text
