import asyncio
import os
import unittest
from pathlib import Path

from memory.savings_memory import (
    initialize_database,
    create_savings_goal,
    get_active_savings_goal,
    add_savings_contribution,
    get_savings_summary,
    get_savings_goal_history,
    get_connection,
)
from tools.budget_calculator import calculate_budget
from tools.guideline_retriever import retrieve_guidelines
from tools.savings_calculator import calculate_savings_progress
from agents.guardrail import review_response


TEST_DB = Path(__file__).resolve().parents[1] / "memory" / "savings_test.db"


class TestFinanceCoach(unittest.TestCase):

    def setUp(self):
        """Ensure clean test tables and reset auto-increment counters before each test."""
        initialize_database(TEST_DB)
        with get_connection(TEST_DB) as conn:
            conn.execute("DELETE FROM savings_contributions")
            conn.execute("DELETE FROM savings_goals")
            conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('savings_goals', 'savings_contributions')")

    def tearDown(self):
        """Clean up test tables."""
        with get_connection(TEST_DB) as conn:
            conn.execute("DELETE FROM savings_contributions")
            conn.execute("DELETE FROM savings_goals")
            conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('savings_goals', 'savings_contributions')")

    def test_first_time_savings_goal_creation(self):
        """Test creating a savings goal for the first time."""
        goal = create_savings_goal(
            goal_amount=50000.0,
            initial_savings=10000.0,
            db_path=TEST_DB
        )

        self.assertEqual(goal["goal_id"], 1)
        self.assertEqual(goal["goal_amount"], 50000.0)
        self.assertEqual(goal["initial_savings"], 10000.0)
        self.assertEqual(goal["current_savings"], 10000.0)
        self.assertEqual(goal["progress_percentage"], 20.0)
        self.assertEqual(goal["remaining_amount"], 40000.0)
        self.assertEqual(goal["status"], "active")
        self.assertFalse(goal["goal_completed"])

    def test_monthly_and_manual_contributions(self):
        """Test adding monthly and manual contributions."""
        create_savings_goal(goal_amount=50000.0, initial_savings=10000.0, db_path=TEST_DB)

        # Monthly contribution
        res1 = add_savings_contribution(
            contribution_id="M-01",
            contribution_type="monthly",
            amount=5000.0,
            description="Nov savings",
            month="November 2026",
            db_path=TEST_DB
        )
        self.assertEqual(res1["status"], "success")
        self.assertEqual(res1["summary"]["current_savings"], 15000.0)
        self.assertEqual(res1["summary"]["total_contributions"], 5000.0)

        # Manual contribution
        res2 = add_savings_contribution(
            contribution_id="MAN-01",
            contribution_type="manual",
            amount=3000.0,
            description="Bonus saved",
            month=None,
            db_path=TEST_DB
        )
        self.assertEqual(res2["status"], "success")
        self.assertEqual(res2["summary"]["current_savings"], 18000.0)
        self.assertEqual(res2["summary"]["total_contributions"], 8000.0)

    def test_duplicate_contribution_prevention(self):
        """Test that duplicate contribution IDs are safely rejected."""
        create_savings_goal(goal_amount=50000.0, initial_savings=10000.0, db_path=TEST_DB)

        res1 = add_savings_contribution(
            contribution_id="DUP-01",
            contribution_type="monthly",
            amount=5000.0,
            description="Nov savings",
            month="November 2026",
            db_path=TEST_DB
        )
        self.assertEqual(res1["status"], "success")

        # Same ID again
        res2 = add_savings_contribution(
            contribution_id="DUP-01",
            contribution_type="monthly",
            amount=5000.0,
            description="Nov savings duplicate",
            month="November 2026",
            db_path=TEST_DB
        )
        self.assertEqual(res2["status"], "duplicate")
        # Balance must remain 15000, not 20000
        summary = get_savings_summary(db_path=TEST_DB)
        self.assertEqual(summary["current_savings"], 15000.0)
        self.assertEqual(summary["contribution_count"], 1)

    def test_goal_completion_and_subsequent_goal_creation(self):
        """Test completing a goal and then creating another active goal."""
        create_savings_goal(goal_amount=20000.0, initial_savings=10000.0, db_path=TEST_DB)

        # Add 10,000 to complete goal 1
        res = add_savings_contribution(
            contribution_id="COMPLETE-01",
            contribution_type="monthly",
            amount=10000.0,
            description="Final push",
            month="Dec 2026",
            db_path=TEST_DB
        )
        self.assertEqual(res["status"], "success")
        self.assertTrue(res["summary"]["goal_completed"])
        self.assertEqual(res["summary"]["status"], "completed")

        # Cannot contribute to completed goal
        with self.assertRaises(ValueError):
            add_savings_contribution(
                contribution_id="FAIL-01",
                contribution_type="monthly",
                amount=1000.0,
                description="Extra",
                month="Jan 2027",
                goal_id=1,
                db_path=TEST_DB
            )

        # Now create subsequent Goal #2
        goal2 = create_savings_goal(
            goal_amount=100000.0,
            initial_savings=5000.0,
            db_path=TEST_DB
        )
        self.assertEqual(goal2["goal_id"], 2)
        self.assertEqual(goal2["goal_amount"], 100000.0)
        self.assertEqual(goal2["status"], "active")

        # Verify history has both goals preserved
        history = get_savings_goal_history(db_path=TEST_DB)
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["goal_id"], 1)
        self.assertEqual(history[0]["status"], "completed")
        self.assertEqual(history[1]["goal_id"], 2)
        self.assertEqual(history[1]["status"], "active")

    def test_budget_calculator_50_30_20(self):
        """Test correct 50/30/20 calculation, overspending alerts, and savings shortfall."""
        income = 100000.0
        transactions = [
            {"id": "T1", "description": "Rent", "amount": 60000.0, "category": "Needs"},
            {"id": "T2", "description": "Dining", "amount": 25000.0, "category": "Wants"},
            {"id": "T3", "description": "Savings deposit", "amount": 10000.0, "category": "Savings"},
        ]

        calc = calculate_budget(monthly_income=income, transactions=transactions)

        # Needs budget is 50,000; spending is 60,000 -> OVERSPENDING by 10,000
        self.assertEqual(calc["budget_allocation"]["Needs"]["budget"], 50000.0)
        self.assertEqual(calc["budget_allocation"]["Needs"]["actual"], 60000.0)
        self.assertEqual(calc["budget_allocation"]["Needs"]["status"], "OVERSPENDING")

        # Wants budget is 30,000; spending is 25,000 -> WITHIN_BUDGET
        self.assertEqual(calc["budget_allocation"]["Wants"]["budget"], 30000.0)
        self.assertEqual(calc["budget_allocation"]["Wants"]["actual"], 25000.0)
        self.assertEqual(calc["budget_allocation"]["Wants"]["status"], "WITHIN_BUDGET")

        # Savings target is 20,000; actual is 10,000 -> SAVINGS_SHORTFALL of 10,000
        self.assertEqual(calc["monthly_savings_target"], 20000.0)
        self.assertEqual(calc["actual_savings"], 10000.0)
        self.assertEqual(calc["savings_shortfall"], 10000.0)
        self.assertEqual(calc["budget_allocation"]["Savings"]["status"], "SAVINGS_SHORTFALL")

    def test_rag_guideline_retrieval(self):
        """Test TF-IDF guideline retriever."""
        query = "50/30/20 rule savings target shortfall overspending"
        results = retrieve_guidelines(query, top_k=3)
        self.assertGreater(len(results), 0)
        headings = [r["heading"] for r in results]
        self.assertTrue(
            any("Monthly Income Allocation" in h or "Budget Calculation" in h or "Savings Target" in h for h in headings)
        )

    def test_guardrail_blocking_and_allowing(self):
        """Test guardrail blocking tax/investment advice and allowing budget advice."""
        async def run_both():
            safe_req = "How do I balance my rent and groceries?"
            safe_resp = "Under the 50/30/20 rule, keep essential needs under 50% of your income."
            res_allow = await review_response(safe_req, safe_resp)

            unsafe_req = "Which stock or crypto should I invest my savings into for high returns?"
            unsafe_resp = "You should invest in XYZ stock for guaranteed returns."
            res_block = await review_response(unsafe_req, unsafe_resp)

            return res_allow, res_block

        res_allow, res_block = asyncio.run(run_both())
        self.assertEqual(res_allow["decision"], "ALLOW")
        self.assertEqual(res_block["decision"], "BLOCK")


if __name__ == "__main__":
    unittest.main()
