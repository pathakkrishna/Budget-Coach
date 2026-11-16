import asyncio
import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.transaction_categoriser import categorize_transactions
from agents.budget_rule import run_budget_rule_agent
from agents.savings_goal import run_savings_goal_agent
from agents.guardrail import review_response
from tools.budget_calculator import calculate_budget
from memory.savings_memory import (
    create_savings_goal,
    add_savings_contribution,
    get_savings_summary,
    get_active_savings_goal,
    reset_session_memory,
    set_current_user_id,
    save_user_month_data,
    get_user_months_data,
    delete_user_month_data
)

app = FastAPI(title="Personal Finance Budget Coach API")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory fallback storage
session_months: Dict[str, Any] = {}


class TransactionItem(BaseModel):
    id: Optional[str] = None
    description: str
    amount: float


class AnalyzeRequest(BaseModel):
    month: str
    monthly_income: float
    expenses: List[TransactionItem]
    actual_savings: float
    do_long_term_savings: bool = False
    goal_target: Optional[float] = None
    goal_initial: Optional[float] = 0.0
    user_id: Optional[str] = None


class SaveMonthRequest(BaseModel):
    month: str
    month_data: Dict[str, Any]
    user_id: Optional[str] = None


class DeleteMonthRequest(BaseModel):
    month: str
    user_id: Optional[str] = None


class ResetSessionRequest(BaseModel):
    user_id: Optional[str] = None


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Personal Finance Budget Coach API is running"}


@app.get("/api/user-data")
def get_user_data(
    user_id: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Retrieve user-scoped months and persistent savings goal.
    Ensures complete isolation between accounts (e.g. Chris vs new user).
    """
    effective_user = user_id or x_user_id or "default"
    set_current_user_id(effective_user)
    
    saved_months = get_user_months_data(effective_user)
    try:
        active_goal = get_active_savings_goal()
    except Exception:
        active_goal = None
        
    return {
        "user_id": effective_user,
        "months": saved_months,
        "goal": active_goal
    }


@app.post("/api/save-month")
def save_month_endpoint(
    req: SaveMonthRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Persist month data directly to the user's SQLite database."""
    effective_user = req.user_id or x_user_id or "default"
    set_current_user_id(effective_user)
    save_user_month_data(req.month, req.month_data, effective_user)
    return {"status": "success", "month": req.month}


@app.post("/api/delete-month")
def delete_month_endpoint(
    req: DeleteMonthRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Delete a specific month for a user."""
    effective_user = req.user_id or x_user_id or "default"
    set_current_user_id(effective_user)
    delete_user_month_data(req.month, effective_user)
    return {"status": "success", "deleted": req.month}


@app.get("/api/savings-goal")
def get_current_savings_goal(
    user_id: Optional[str] = Query(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Retrieve the currently active savings goal for the requesting user."""
    effective_user = user_id or x_user_id or "default"
    set_current_user_id(effective_user)
    try:
        summary = get_active_savings_goal()
        return {"goal": summary}
    except Exception:
        return {"goal": None}


@app.post("/api/reset-session")
def reset_session(
    payload: Optional[ResetSessionRequest] = None,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Reset the session memory for a user's fresh start."""
    effective_user = (payload.user_id if payload else None) or x_user_id or "default"
    set_current_user_id(effective_user)
    reset_session_memory()
    session_months.clear()
    return {"status": "success", "message": f"Session memory for user '{effective_user}' reset successfully."}


@app.get("/api/months")
def get_recorded_months():
    """Return all recorded months and summary stats for multi-month graph."""
    months_list = list(session_months.values())
    return {
        "months": months_list,
        "count": len(months_list)
    }


@app.post("/api/preview-budget")
def preview_budget(payload: dict):
    """Instant preview of 50/30/20 budget without invoking LLM."""
    income = float(payload.get("monthly_income", 0))
    transactions = payload.get("transactions", [])
    if income <= 0:
        return {"error": "Income must be greater than zero"}

    calc = calculate_budget(income, transactions)
    return calc


@app.post("/api/analyze")
async def analyze_finances(
    request: AnalyzeRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Run the full 5-Agent pipeline coordinated by Coach Manager:
    1. Coach Manager initializes & coordinates
    2. Transaction Categoriser Agent (Agent 1)
    3. Budget Rule Agent with TF-IDF RAG & calculate_budget_tool (Agent 2)
    4. Savings Goal Agent & SQLite Session Memory (Agent 3)
    5. Guardrail Review (Agent 4)
    6. Coach Manager Final Synthesis (Agent 5)
    """
    effective_user = request.user_id or x_user_id or "default"
    set_current_user_id(effective_user)

    if request.monthly_income <= 0:
        raise HTTPException(status_code=400, detail="Monthly income must be greater than 0")

    agent_trace = []
    start_time = datetime.now(timezone.utc).isoformat()

    # Step 0: Coach Manager (Head Agent)
    agent_trace.append({
        "step": 1,
        "agent": "Coach Manager (Head Agent)",
        "role": "Central Orchestrator",
        "task": f"Received monthly budgeting request for '{request.month}'. Initiating 5-agent coordination pipeline.",
        "tool_called": "Workflow Orchestrator",
        "tool_input": {
            "month": request.month,
            "monthly_income": request.monthly_income,
            "expense_count": len(request.expenses),
            "actual_savings": request.actual_savings,
            "do_long_term_savings": request.do_long_term_savings
        },
        "tool_output": "Parameters validated. Dispatched transactions to Transaction Categoriser Agent.",
        "status": "COMPLETED"
    })

    # Format input transactions
    raw_transactions = []
    for idx, item in enumerate(request.expenses, start=1):
        raw_transactions.append({
            "id": item.id or f"T{idx:03d}",
            "description": item.description,
            "amount": float(item.amount)
        })

    # Add actual monthly savings as transaction if > 0
    if request.actual_savings > 0:
        raw_transactions.append({
            "id": f"SAV-{uuid.uuid4().hex[:8]}",
            "description": f"Actual savings contribution for {request.month}",
            "amount": float(request.actual_savings)
        })

    # 1. Transaction Categoriser Agent
    try:
        cat_result = await categorize_transactions(raw_transactions)
        categorised_transactions = cat_result.get("transactions", raw_transactions)
    except Exception as e:
        categorised_transactions = raw_transactions
        for t in categorised_transactions:
            if "SAV-" in t["id"]:
                t["category"] = "Savings"
            else:
                t["category"] = "Needs"

    agent_trace.append({
        "step": 2,
        "agent": "Transaction Categoriser Agent",
        "role": "Expense Classification",
        "task": f"Categorised {len(raw_transactions)} transactions into project categories: Needs, Wants, Savings, and Unclassified.",
        "tool_called": "categorize_transactions()",
        "tool_input": {
            "transactions_count": len(raw_transactions),
            "sample": raw_transactions[:2]
        },
        "tool_output": {
            "classified_count": len(categorised_transactions),
            "categories_summary": {
                "Needs": sum(1 for t in categorised_transactions if t.get("category") == "Needs"),
                "Wants": sum(1 for t in categorised_transactions if t.get("category") == "Wants"),
                "Savings": sum(1 for t in categorised_transactions if t.get("category") == "Savings"),
            }
        },
        "status": "COMPLETED"
    })

    # 2. Budget Calculation & 50/30/20 Status
    budget_calc = calculate_budget(request.monthly_income, categorised_transactions)

    # 3. Budget Rule Agent (with TF-IDF RAG)
    try:
        budget_analysis_text = await run_budget_rule_agent(
            monthly_income=request.monthly_income,
            transactions=categorised_transactions
        )
    except Exception as e:
        budget_analysis_text = f"Budget analysis completed with standard calculations: {budget_calc}"

    agent_trace.append({
        "step": 3,
        "agent": "Budget Rule Agent",
        "role": "50/30/20 Rule & RAG Retrieval",
        "task": "Retrieved educational guidelines using TF-IDF cosine similarity and computed 50/30/20 allocations.",
        "tool_called": "calculate_budget_tool()",
        "tool_input": {
            "monthly_income": request.monthly_income,
            "allocation_limits": {"Needs": "50%", "Wants": "30%", "Savings": "20%"}
        },
        "tool_output": {
            "Needs_budget": budget_calc["budget_allocation"]["Needs"]["budget"],
            "Needs_spent": budget_calc["budget_allocation"]["Needs"]["actual"],
            "Needs_status": budget_calc["budget_allocation"]["Needs"]["status"],
            "Wants_budget": budget_calc["budget_allocation"]["Wants"]["budget"],
            "Wants_spent": budget_calc["budget_allocation"]["Wants"]["actual"],
            "Wants_status": budget_calc["budget_allocation"]["Wants"]["status"],
            "Savings_target": budget_calc["monthly_savings_target"],
            "Savings_shortfall": budget_calc["savings_shortfall"]
        },
        "status": "COMPLETED"
    })

    # 4. Long-Term Savings Goal (Agent 3 & SQLite Session Memory)
    savings_summary = None
    savings_report_text = "No long-term savings goal configured."
    tools_called_for_savings = []

    if request.do_long_term_savings:
        try:
            active_goal = get_active_savings_goal()
        except Exception:
            active_goal = None

        if active_goal is None and request.goal_target and request.goal_target > 0:
            active_goal = create_savings_goal(
                goal_amount=request.goal_target,
                initial_savings=request.goal_initial or 0.0
            )
            tools_called_for_savings.append(f"create_savings_goal(target={request.goal_target}, initial={request.goal_initial})")

        if active_goal is not None:
            # Record actual savings for this month
            if request.actual_savings > 0:
                try:
                    c_id = f"MONTHLY-{uuid.uuid4().hex}"
                    res = add_savings_contribution(
                        contribution_id=c_id,
                        contribution_type="monthly",
                        amount=request.actual_savings,
                        description=f"Actual savings for {request.month}",
                        month=request.month,
                        goal_id=active_goal["goal_id"]
                    )
                    active_goal = res["summary"]
                    tools_called_for_savings.append(f"add_savings_contribution(id={c_id[:12]}, amount={request.actual_savings})")
                except Exception as e:
                    pass

            savings_summary = get_savings_summary(active_goal["goal_id"])
            tools_called_for_savings.append(f"get_savings_summary(goal_id={active_goal['goal_id']})")

            # Call Savings Goal Agent for report
            agent_prompt = (
                f"Provide a comprehensive savings goal report based on this session record:\n"
                f"Target: ₹{savings_summary['goal_amount']:,.2f}\n"
                f"Initial Savings: ₹{savings_summary['initial_savings']:,.2f}\n"
                f"Total Actual Contributions: ₹{savings_summary['total_contributions']:,.2f}\n"
                f"Current Balance: ₹{savings_summary['current_savings']:,.2f}\n"
                f"Progress Achieved: {savings_summary['progress_percentage']}%\n"
                f"Remaining: ₹{savings_summary['remaining_amount']:,.2f}\n"
                f"Status: {savings_summary['status'].upper()}\n"
                f"Actual savings added for {request.month}: ₹{request.actual_savings:,.2f}.\n\n"
                f"CRITICAL: All contributions are already safely recorded in session memory. "
                f"DO NOT call add_savings_contribution_tool or set_savings_goal_tool. "
                f"Simply format and explain this savings report clearly."
            )
            try:
                savings_report_text = await run_savings_goal_agent(agent_prompt)
            except Exception:
                savings_report_text = (
                    f"Savings Goal Report\n"
                    f"Target: ₹{savings_summary['goal_amount']:,.2f} | "
                    f"Current Balance: ₹{savings_summary['current_savings']:,.2f} "
                    f"({savings_summary['progress_percentage']}% achieved). "
                    f"Remaining: ₹{savings_summary['remaining_amount']:,.2f}."
                )

    agent_trace.append({
        "step": 4,
        "agent": "Savings Goal Agent",
        "role": "Persistent Savings Tracking",
        "task": "Managed long-term savings goals and recorded actual monthly contributions in SQLite session memory.",
        "tool_called": " & ".join(tools_called_for_savings) if tools_called_for_savings else "None (No Goal Configured)",
        "tool_input": {
            "do_long_term_savings": request.do_long_term_savings,
            "actual_monthly_savings": request.actual_savings,
            "goal_target": request.goal_target
        },
        "tool_output": {
            "current_balance": savings_summary["current_savings"] if savings_summary else 0,
            "progress_percentage": savings_summary["progress_percentage"] if savings_summary else 0,
            "status": savings_summary["status"] if savings_summary else "N/A"
        },
        "status": "COMPLETED"
    })

    # 5. Compile Final Unified Report
    categorised_lines = "\n".join(
        f"  - [{t.get('category', 'Unclassified')}] {t['description']} (ID: {t['id']}): ₹{t['amount']:,.2f}"
        for t in categorised_transactions
    )

    raw_final_report = f"""
PERSONAL FINANCE BUDGET COACH
========================================

BUDGET MONTH:
{request.month}

MONTHLY INCOME:
₹{request.monthly_income:,.2f}

ACTUAL MONTHLY SAVINGS:
₹{request.actual_savings:,.2f}

CATEGORISED TRANSACTIONS:
{categorised_lines}

BUDGET ANALYSIS:
{budget_analysis_text}

LONG-TERM SAVINGS GOAL ANALYSIS:
{savings_report_text}

========================================
END OF FINANCIAL REPORT
"""

    # 6. Guardrail Review (Agent 4)
    guardrail_res = await review_response(
        user_request="The user requested a personal monthly budgeting and savings analysis.",
        proposed_response=raw_final_report
    )

    agent_trace.append({
        "step": 5,
        "agent": "Guardrail Agent",
        "role": "Compliance & Safety Gate",
        "task": "Audited original user request and proposed final financial report to ensure zero investment or tax advice.",
        "tool_called": "review_response()",
        "tool_input": {
            "check": "No securities, stock picks, mutual funds, or tax avoidance advice"
        },
        "tool_output": {
            "decision": guardrail_res.get("decision", "ALLOW"),
            "reason": guardrail_res.get("reason", "Approved budgeting and savings guidance only.")
        },
        "status": "COMPLETED"
    })

    # 7. Final synthesis by Coach Manager
    agent_trace.append({
        "step": 6,
        "agent": "Coach Manager (Final Synthesis)",
        "role": "Coordinator Output Assembly",
        "task": "Compiled validated outputs from all 4 specialist agents into the final approved report.",
        "tool_called": "Executive Report Publisher",
        "tool_input": {"guardrail_approved": guardrail_res.get("decision") == "ALLOW"},
        "tool_output": "Financial report rendered successfully.",
        "status": "COMPLETED"
    })

    # Store in multi-month session history
    needs_spent = budget_calc["budget_allocation"]["Needs"]["actual"]
    wants_spent = budget_calc["budget_allocation"]["Wants"]["actual"]
    total_spent = needs_spent + wants_spent

    month_record = {
        "month": request.month,
        "monthly_income": request.monthly_income,
        "total_expenses": total_spent,
        "needs_spent": needs_spent,
        "wants_spent": wants_spent,
        "actual_savings": request.actual_savings,
        "monthly_savings_target": budget_calc["monthly_savings_target"],
        "savings_shortfall": budget_calc["savings_shortfall"],
        "categorised_transactions": categorised_transactions,
        "budget_calculation": budget_calc,
        "budget_analysis": budget_analysis_text,
        "savings_summary": savings_summary,
        "savings_report": savings_report_text,
        "guardrail": {
            "decision": guardrail_res.get("decision", "ALLOW"),
            "reason": guardrail_res.get("reason", "Approved")
        },
        "final_report": guardrail_res.get("final_response", raw_final_report),
        "agent_trace": agent_trace
    }

    session_months[request.month] = month_record
    save_user_month_data(request.month, month_record, effective_user)
    user_months_all = get_user_months_data(effective_user)

    return {
        **month_record,
        "all_months": list(user_months_all.values())
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
