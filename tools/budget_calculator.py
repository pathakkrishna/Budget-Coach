
# =====================================================
# BUDGET CALCULATION TOOL
# =====================================================

def calculate_budget(monthly_income, transactions):

    # -----------------------------------------------
    # 1. Validate monthly income
    # -----------------------------------------------

    if (
        isinstance(monthly_income, bool)
        or not isinstance(monthly_income, (int, float))
        or monthly_income <= 0
    ):
        raise ValueError("Monthly income must be greater than zero.")

    if not isinstance(transactions, list):
        raise ValueError("Transactions must be a list.")

    # -----------------------------------------------
    # 2. Define 50/30/20 allocation
    # -----------------------------------------------

    budget_limits = {
        "Needs": monthly_income * 0.50,
        "Wants": monthly_income * 0.30,
        "Savings": monthly_income * 0.20
    }

    # -----------------------------------------------
    # 3. Initialize actual totals
    # -----------------------------------------------

    actual_totals = {
        "Needs": 0.0,
        "Wants": 0.0,
        "Savings": 0.0
    }

    unclassified_total = 0.0

    # -----------------------------------------------
    # 4. Calculate actual transaction totals
    # -----------------------------------------------

    for transaction in transactions:

        if not isinstance(transaction, dict):
            raise ValueError("Each transaction must be a dictionary.")

        amount = transaction.get("amount")
        category = transaction.get("category")

        if (
            isinstance(amount, bool)
            or not isinstance(amount, (int, float))
            or amount < 0
        ):
            raise ValueError("Invalid transaction amount.")

        if category in actual_totals:
            actual_totals[category] += amount

        elif category == "Unclassified":
            unclassified_total += amount

        else:
            raise ValueError(f"Invalid category: {category}")

    # -----------------------------------------------
    # 5. Compare budget with actual totals
    # -----------------------------------------------

    results = {}

    for category in ["Needs", "Wants", "Savings"]:

        budget = budget_limits[category]
        actual = actual_totals[category]

        difference = budget - actual

        if category == "Savings":

            status = (
                "TARGET_MET"
                if actual >= budget
                else "SAVINGS_SHORTFALL"
            )

        else:

            status = (
                "OVERSPENDING"
                if actual > budget
                else "WITHIN_BUDGET"
            )

        results[category] = {
            "budget": round(budget, 2),
            "actual": round(actual, 2),
            "difference": round(difference, 2),
            "status": status
        }

    # -----------------------------------------------
    # 6. Return calculation results
    # -----------------------------------------------

    return {
        "monthly_income": round(monthly_income, 2),

        "budget_allocation": results,

        "monthly_savings_target": round(
            budget_limits["Savings"], 2
        ),

        "actual_savings": round(
            actual_totals["Savings"], 2
        ),

        "savings_shortfall": round(
            max(
                budget_limits["Savings"] - actual_totals["Savings"],
                0
            ),
            2
        ),

        "unclassified_total": round(unclassified_total, 2)
    }


# =====================================================
# TEST THE CALCULATION TOOL
# =====================================================

if __name__ == "__main__":

    import json

    sample_transactions = [

        {
            "id": "T001",
            "description": "Monthly house rent",
            "amount": 25000,
            "category": "Needs"
        },

        {
            "id": "T002",
            "description": "Groceries",
            "amount": 15000,
            "category": "Needs"
        },

        {
            "id": "T003",
            "description": "Netflix subscription",
            "amount": 649,
            "category": "Wants"
        },

        {
            "id": "T004",
            "description": "Shopping",
            "amount": 3000,
            "category": "Wants"
        },

        {
            "id": "T005",
            "description": "Monthly savings contribution",
            "amount": 15000,
            "category": "Savings"
        }
    ]

    result = calculate_budget(
        monthly_income=100000,
        transactions=sample_transactions
    )

    print("\nBUDGET CALCULATION RESULTS")
    print(json.dumps(result, indent=4))
