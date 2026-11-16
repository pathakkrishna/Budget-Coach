
# =====================================================
# SAVINGS GOAL CALCULATION TOOL
# =====================================================

def calculate_savings_progress(target_amount, current_savings):

    # -----------------------------------------------
    # 1. Validate inputs
    # -----------------------------------------------

    if (
        isinstance(target_amount, bool)
        or not isinstance(target_amount, (int, float))
        or target_amount <= 0
    ):
        raise ValueError("Target amount must be greater than zero.")

    if (
        isinstance(current_savings, bool)
        or not isinstance(current_savings, (int, float))
        or current_savings < 0
    ):
        raise ValueError("Current savings cannot be negative.")

    # -----------------------------------------------
    # 2. Calculate savings progress
    # -----------------------------------------------

    progress_percentage = (
        current_savings / target_amount
    ) * 100

    # -----------------------------------------------
    # 3. Calculate remaining amount
    # -----------------------------------------------

    remaining_amount = max(
        target_amount - current_savings,
        0
    )

    # -----------------------------------------------
    # 4. Return results
    # -----------------------------------------------

    return {
        "target_amount": target_amount,
        "current_savings": current_savings,
        "progress_percentage": round(progress_percentage, 2),
        "remaining_amount": round(remaining_amount, 2)
    }


# =====================================================
# TEST THE SAVINGS CALCULATION
# =====================================================

if __name__ == "__main__":

    result = calculate_savings_progress(
        target_amount=50000,
        current_savings=20000
    )

    import json

    print("\nSAVINGS GOAL CALCULATION")
    print(json.dumps(result, indent=4))
