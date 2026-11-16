import asyncio
import json
import uuid

from agents.transaction_categoriser import categorize_transactions
from agents.budget_rule import run_budget_rule_agent
from agents.savings_goal import run_savings_goal_agent
from agents.guardrail import review_response

from tools.budget_calculator import calculate_budget

from memory.savings_memory import (
    create_savings_goal,
    set_savings_goal,
    add_savings_contribution,
    get_savings_summary,
    get_active_savings_goal,
    get_savings_goal_history,
    reset_session_memory
)


# =====================================================
# 1. USER INPUT HELPERS
# =====================================================

def get_positive_amount(question):
    """Prompt the user for a number strictly greater than zero."""
    while True:
        try:
            amount = float(
                input(question)
                .replace(",", "")
                .replace("₹", "")
                .strip()
            )

            if amount <= 0:
                print("Please enter an amount greater than zero.")
                continue

            return amount

        except ValueError:
            print("Invalid amount. Please enter a valid number.")


def get_nonnegative_amount(question):
    """Prompt the user for a number greater than or equal to zero."""
    while True:
        try:
            amount = float(
                input(question)
                .replace(",", "")
                .replace("₹", "")
                .strip()
            )

            if amount < 0:
                print("Amount cannot be negative.")
                continue

            return amount

        except ValueError:
            print("Invalid amount. Please enter a valid number.")


def get_yes_no(question):
    """Prompt the user for a yes/no response."""
    while True:
        answer = input(question).strip().lower()

        if answer in ("yes", "y"):
            return True

        if answer in ("no", "n"):
            return False

        print("Please enter Yes or No.")


# =====================================================
# 2. COLLECT MONTH AND MONTHLY INCOME
# =====================================================

def collect_budget_month():
    print("\n========== BUDGET MONTH ==========")

    while True:
        month = input(
            "Which month is this budget for? (e.g. November 2026): "
        ).strip()

        if month:
            return month

        print("Month cannot be empty.")


def collect_monthly_income():
    print("\n========== MONTHLY INCOME ==========")

    income = get_positive_amount(
        "What is your total monthly income (₹)? "
    )

    return income


# =====================================================
# 3. COLLECT MONTHLY EXPENSES
# =====================================================

def collect_expenses():
    print("\n========== MONTHLY EXPENSES ==========")

    transactions = []
    index = 1

    while True:
        print(f"\nExpense {index}")
        description = input("Expense name (or press Enter when done): ").strip()

        if not description or description.lower() == "done":
            if not transactions:
                print("Please enter at least one expense.")
                continue
            break

        amount = get_positive_amount("Expense amount (₹): ")

        transactions.append({
            "id": f"T{index:03d}",
            "description": description,
            "amount": amount
        })
        index += 1

    return transactions


# =====================================================
# 4. COLLECT ACTUAL MONTHLY SAVINGS
# =====================================================

def collect_actual_savings(monthly_income):
    print("\n========== MONTHLY SAVINGS ==========")

    monthly_target = monthly_income * 0.20

    print(
        f"Your monthly savings target according to "
        f"the 50/30/20 rule is ₹{monthly_target:,.2f}."
    )

    print(
        "This is your planned target, not your actual savings."
    )

    actual_savings = get_nonnegative_amount(
        "How much did you actually save this month (₹)? "
    )

    return actual_savings


# =====================================================
# 5. HANDLE LONG-TERM SAVINGS GOAL (SESSION MEMORY)
# =====================================================

async def handle_savings_goal(month, actual_savings):
    print("\n========== LONG-TERM SAVINGS GOAL ==========")

    # Check if a goal is already active in this session
    try:
        active_goal = get_active_savings_goal()
    except (ValueError, Exception):
        active_goal = None

    if active_goal is None:
        # Prompt if the user wants to do long-term savings
        do_long_term = get_yes_no("Do you want to do long-term savings? (yes/no): ")
        if not do_long_term:
            print("No long-term savings goal configured.")
            return None

        # Ask for the goal amount and initial savings
        print("\n========== SET SAVINGS GOAL ==========")
        target = get_positive_amount("What is your total savings goal amount (₹)? ")
        previous_savings = get_nonnegative_amount(
            "How much have you already saved towards this goal before this month (₹)? "
        )

        try:
            active_goal = create_savings_goal(
                goal_amount=target,
                initial_savings=previous_savings
            )
            print(f"\nSavings goal of ₹{target:,.2f} created successfully.")
        except ValueError as err:
            print(f"Savings goal setup failed: {err}")
            return None

    # Record actual monthly savings to the active goal
    if actual_savings > 0:
        contribution_id = f"MONTHLY-{uuid.uuid4().hex}"
        try:
            result = add_savings_contribution(
                contribution_id=contribution_id,
                contribution_type="monthly",
                amount=actual_savings,
                description=f"Actual savings for {month}",
                month=month,
                goal_id=active_goal["goal_id"]
            )
            print(f"\n₹{actual_savings:,.2f} recorded for {month} towards your savings goal.")
            active_goal = result["summary"]
        except ValueError as error:
            print(f"Monthly contribution failed: {error}")
            return None
    else:
        print("\nActual monthly savings are ₹0. No monthly contribution added.")

    # Show how much goal has been achieved
    summary = get_savings_summary(active_goal["goal_id"])

    print("\n========== SAVINGS GOAL ACHIEVED ==========")
    print(f"Target amount: ₹{summary['goal_amount']:,.2f}")
    print(f"Initial savings: ₹{summary['initial_savings']:,.2f}")
    print(f"Total contributions: ₹{summary['total_contributions']:,.2f}")
    print(f"Current savings balance: ₹{summary['current_savings']:,.2f}")
    print(f"Goal achieved: {summary['progress_percentage']}%")
    print(f"Remaining amount: ₹{summary['remaining_amount']:,.2f}")
    print(f"Status: {summary['status'].upper()}")

    # If completed within the session, ask user to add a new goal
    if summary["goal_completed"]:
        print("\n🎉 Congratulations! You have achieved your savings goal!")
        add_new = get_yes_no("Would you like to add a new savings goal? (yes/no): ")
        if add_new:
            print("\n========== SET NEW SAVINGS GOAL ==========")
            new_target = get_positive_amount("What is your new savings goal target amount (₹)? ")
            new_initial = get_nonnegative_amount("How much have you already saved towards this new goal (₹)? ")
            try:
                new_goal = create_savings_goal(
                    goal_amount=new_target,
                    initial_savings=new_initial
                )
                print(f"New savings goal of ₹{new_target:,.2f} created successfully!")
            except ValueError as error:
                print(f"Failed to create new goal: {error}")

    # Call Savings Goal Agent for comprehensive analysis
    agent_prompt = (
        f"Provide a comprehensive savings goal report based on this session record:\n"
        f"Target: ₹{summary['goal_amount']:,.2f}\n"
        f"Initial Savings: ₹{summary['initial_savings']:,.2f}\n"
        f"Total Actual Contributions: ₹{summary['total_contributions']:,.2f}\n"
        f"Current Balance: ₹{summary['current_savings']:,.2f}\n"
        f"Progress Achieved: {summary['progress_percentage']}%\n"
        f"Remaining: ₹{summary['remaining_amount']:,.2f}\n"
        f"Status: {summary['status'].upper()}\n"
        f"Actual savings added for {month}: ₹{actual_savings:,.2f}.\n\n"
        f"CRITICAL: All contributions are already safely recorded in session memory. "
        f"DO NOT call add_savings_contribution_tool or set_savings_goal_tool. "
        f"Simply format and explain this savings report clearly."
    )

    try:
        savings_report = await run_savings_goal_agent(agent_prompt)
        return savings_report
    except Exception as err:
        print(f"[COACH MANAGER] Savings Goal Agent fallback due to: {err}")
        return (
            f"Savings Goal Report\n"
            f"Target: ₹{summary['goal_amount']:,.2f}\n"
            f"Initial savings: ₹{summary['initial_savings']:,.2f}\n"
            f"Total contributions: ₹{summary['total_contributions']:,.2f}\n"
            f"Current balance: ₹{summary['current_savings']:,.2f}\n"
            f"Progress achieved: {summary['progress_percentage']}%\n"
            f"Remaining: ₹{summary['remaining_amount']:,.2f}\n"
            f"Status: {summary['status'].upper()}"
        )


# =====================================================
# 6. PROCESS ONE MONTHLY BUDGET
# =====================================================

async def process_monthly_budget():
    print("\n")
    print("=" * 55)
    print("       MONTHLY BUDGET ANALYSIS")
    print("=" * 55)

    # Step 1: Collect budget month.
    month = collect_budget_month()

    # Step 2: Collect monthly income.
    monthly_income = collect_monthly_income()

    # Step 3: Collect monthly expenses.
    transactions = collect_expenses()

    # Step 4: Collect actual monthly savings.
    actual_savings = collect_actual_savings(monthly_income)

    # Add actual savings as a transaction for 50/30/20 budget analysis.
    if actual_savings > 0:
        transactions.append({
            "id": f"SAV-{uuid.uuid4().hex[:8]}",
            "description": f"Actual savings contribution for {month}",
            "amount": actual_savings
        })

    # Step 5: Transaction Categoriser Agent.
    print("\n[COACH MANAGER] Calling Transaction Categoriser...")
    categorisation_result = await categorize_transactions(
        transactions
    )
    categorised_transactions = categorisation_result["transactions"]
    print("[COACH MANAGER] Transactions categorised successfully.")

    # Display categorised transactions so the user sees the agent's work
    print("\n" + "=" * 55)
    print("       TRANSACTION CATEGORISATION RESULTS")
    print("=" * 55)
    for index, item in enumerate(categorised_transactions, start=1):
        cat = item.get("category", "Unclassified")
        print(f"  {index}. {item['description']} (ID: {item['id']}) — ₹{item['amount']:,.2f} -> [{cat}]")

    # Step 6: 50/30/20 Budget Calculation & Immediate Status
    budget_calc = calculate_budget(
        monthly_income=monthly_income,
        transactions=categorised_transactions
    )
    alloc = budget_calc["budget_allocation"]

    print("\n" + "=" * 55)
    print("       50/30/20 BUDGET STATUS")
    print("=" * 55)
    print(f"Monthly Income: ₹{monthly_income:,.2f}\n")

    # Needs (50%)
    needs_budget = alloc["Needs"]["budget"]
    needs_actual = alloc["Needs"]["actual"]
    if needs_actual > needs_budget:
        needs_status = f"OVER BUDGET by ₹{needs_actual - needs_budget:,.2f}"
    elif needs_actual < needs_budget:
        needs_status = f"UNDER BUDGET by ₹{needs_budget - needs_actual:,.2f}"
    else:
        needs_status = f"EQUAL TO BUDGET (₹{needs_budget:,.2f})"
    print(f"• Needs (50% Target: ₹{needs_budget:,.2f}) | Actual: ₹{needs_actual:,.2f} -> {needs_status}")

    # Wants (30%)
    wants_budget = alloc["Wants"]["budget"]
    wants_actual = alloc["Wants"]["actual"]
    if wants_actual > wants_budget:
        wants_status = f"OVER BUDGET by ₹{wants_actual - wants_budget:,.2f}"
    elif wants_actual < wants_budget:
        wants_status = f"UNDER BUDGET by ₹{wants_budget - wants_actual:,.2f}"
    else:
        wants_status = f"EQUAL TO BUDGET (₹{wants_budget:,.2f})"
    print(f"• Wants (30% Target: ₹{wants_budget:,.2f}) | Actual: ₹{wants_actual:,.2f} -> {wants_status}")

    # Savings (20%) - Only show when short
    savings_target = budget_calc["monthly_savings_target"]
    actual_sav = budget_calc["actual_savings"]
    shortfall = budget_calc["savings_shortfall"]
    if shortfall > 0:
        print(f"• Savings (20% Target: ₹{savings_target:,.2f}) | Actual: ₹{actual_sav:,.2f} -> SAVINGS SHORTFALL of ₹{shortfall:,.2f}")

    # Step 7: Budget Rule Agent.
    print("\n[COACH MANAGER] Calling Budget Rule Agent...")
    budget_report = await run_budget_rule_agent(
        monthly_income=monthly_income,
        transactions=categorised_transactions
    )
    print("[COACH MANAGER] Budget analysis completed.")

    # Step 8: Handle Long-Term Savings Goal via Savings Goal Agent.
    print("\n[COACH MANAGER] Managing Savings Goal...")
    savings_report = await handle_savings_goal(
        month=month,
        actual_savings=actual_savings
    )

    # Step 9: Compile the final report.
    categorised_summary = "\n".join(
        f"  - [{t.get('category', 'Unclassified')}] {t['description']} (ID: {t['id']}): ₹{t['amount']:,.2f}"
        for t in categorised_transactions
    )

    final_report = f"""
PERSONAL FINANCE BUDGET COACH
========================================

BUDGET MONTH:
{month}

MONTHLY INCOME:
₹{monthly_income:,.2f}

ACTUAL MONTHLY SAVINGS:
₹{actual_savings:,.2f}

CATEGORISED TRANSACTIONS:
{categorised_summary}

BUDGET ANALYSIS:
{budget_report}

LONG-TERM SAVINGS GOAL ANALYSIS:
{savings_report if savings_report else "No long-term savings goal configured."}

========================================
END OF FINANCIAL REPORT
"""

    # Step 10: Guardrail Agent.
    print("\n[COACH MANAGER] Sending report to Guardrail Agent...")

    original_request = (
        "The user requested a personal monthly budgeting "
        "and savings analysis."
    )

    guardrail_result = await review_response(
        user_request=original_request,
        proposed_response=final_report
    )

    # Step 11: Display the approved report.
    print("\n" + "=" * 55)
    print("       FINAL FINANCIAL REPORT")
    print("=" * 55)

    print(guardrail_result["final_response"])
    print("\nGuardrail decision:", guardrail_result["decision"])


# =====================================================
# 7. RUN COACH MANAGER FOR MULTIPLE MONTHS
# =====================================================

async def run_coach_manager():
    print("\n")
    print("=" * 55)
    print("       PERSONAL FINANCE BUDGET COACH")
    print("=" * 55)

    # Reset session memory so every application run starts fresh
    reset_session_memory()

    print("\nStarting fresh session.")

    while True:
        await process_monthly_budget()

        print("\n========== NEXT MONTH ==========")

        continue_budgeting = get_yes_no(
            "Would you like to enter another month's budget? (yes/no): "
        )

        if not continue_budgeting:
            print("\nThank you for using Personal Finance Budget Coach.")
            print("Session complete.")
            break


# =====================================================
# 8. RUN COACH MANAGER
# =====================================================

async def main():
    try:
        await run_coach_manager()
    except Exception as error:
        print("\n[COACH MANAGER ERROR]")
        print(error)


if __name__ == "__main__":
    asyncio.run(main())
