import sqlite3
import json
import re
from pathlib import Path
from datetime import datetime, timezone


# =====================================================
# 1. DATABASE CONFIGURATION & USER SCOPING
# =====================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_DB = PROJECT_ROOT / "memory" / "savings.db"

_CURRENT_USER_ID = None


def set_current_user_id(user_id):
    """Set the active user id for user-scoped SQLite persistent memory."""
    global _CURRENT_USER_ID
    if user_id and str(user_id).strip() not in ("", "default", "null", "undefined"):
        _CURRENT_USER_ID = str(user_id).strip()
    else:
        _CURRENT_USER_ID = None


def get_current_user_id():
    """Retrieve the current active user id."""
    return _CURRENT_USER_ID


def get_user_db_path(user_id=None):
    """Resolve database path scoped to a specific user account."""
    target_id = user_id or _CURRENT_USER_ID
    if not target_id or str(target_id).strip() in ("", "default", "null", "undefined"):
        return DEFAULT_DB
    clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(target_id).strip())
    user_db = PROJECT_ROOT / "memory" / "users" / f"savings_{clean_id}.db"
    user_db.parent.mkdir(parents=True, exist_ok=True)
    return user_db


def get_connection(db_path=None):
    """Create a connection to the selected SQLite database (user-scoped by default)."""
    if db_path is None:
        path = get_user_db_path()
    else:
        path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(path, timeout=30.0)
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def get_current_timestamp():
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc).isoformat()


# =====================================================
# 2. SESSION MEMORY RESET
# =====================================================

def reset_session_memory(db_path=None):
    """
    Reset active session memory for a fresh budgeting cycle.
    Preserves completed goals and contribution history in SQLite.
    Marks any remaining active goals as completed/archived so the new session starts with no active goal.
    """
    initialize_database(db_path)
    with get_connection(db_path) as connection:
        now = get_current_timestamp()
        connection.execute(
            """
            UPDATE savings_goals
            SET status = 'completed', completed_at = ?
            WHERE status = 'active'
            """,
            (now,)
        )


# =====================================================
# 3. INTERNAL HELPER: FETCH SUMMARY WITH CONNECTION
# =====================================================

def _fetch_savings_summary(connection, goal_id=None):
    """Fetch savings summary using an already open connection."""

    if goal_id is None:
        goal = connection.execute(
            """
            SELECT
                goal_id,
                goal_amount,
                initial_savings,
                status,
                created_at,
                completed_at
            FROM savings_goals
            WHERE status = 'active'
            ORDER BY goal_id DESC
            LIMIT 1
            """
        ).fetchone()

        if goal is None:
            goal = connection.execute(
                """
                SELECT
                    goal_id,
                    goal_amount,
                    initial_savings,
                    status,
                    created_at,
                    completed_at
                FROM savings_goals
                ORDER BY goal_id DESC
                LIMIT 1
                """
            ).fetchone()
    else:
        goal = connection.execute(
            """
            SELECT
                goal_id,
                goal_amount,
                initial_savings,
                status,
                created_at,
                completed_at
            FROM savings_goals
            WHERE goal_id = ?
            """,
            (goal_id,)
        ).fetchone()

    if goal is None:
        raise ValueError("Savings goal not found.")

    (
        g_id,
        goal_amount,
        initial_savings,
        status,
        created_at,
        completed_at
    ) = goal

    contribution_total = connection.execute(
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM savings_contributions
        WHERE goal_id = ?
        """,
        (g_id,)
    ).fetchone()[0]

    contribution_count = connection.execute(
        """
        SELECT COUNT(*)
        FROM savings_contributions
        WHERE goal_id = ?
        """,
        (g_id,)
    ).fetchone()[0]

    current_savings = initial_savings + contribution_total

    progress_percentage = (
        current_savings / goal_amount
    ) * 100

    remaining_amount = max(
        goal_amount - current_savings,
        0
    )

    return {
        "goal_id": g_id,
        "goal_amount": round(goal_amount, 2),
        "initial_savings": round(initial_savings, 2),
        "total_contributions": round(contribution_total, 2),
        "current_savings": round(current_savings, 2),
        "progress_percentage": round(progress_percentage, 2),
        "remaining_amount": round(remaining_amount, 2),
        "goal_completed": status == "completed",
        "status": status,
        "created_at": created_at,
        "completed_at": completed_at,
        "contribution_count": contribution_count
    }


# =====================================================
# 4. DATABASE INITIALIZATION AND MIGRATION
# =====================================================

def initialize_database(db_path=None):
    """
    Create the savings tables and safely migrate
    data from previous database structures if needed.
    """

    with get_connection(db_path) as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS savings_goals (
                goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_amount REAL NOT NULL CHECK (goal_amount > 0),
                initial_savings REAL NOT NULL CHECK (initial_savings >= 0),
                status TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed')),
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS savings_contributions (
                contribution_id TEXT PRIMARY KEY,
                goal_id INTEGER NOT NULL,
                contribution_type TEXT NOT NULL
                    CHECK (contribution_type IN ('monthly', 'manual')),
                amount REAL NOT NULL CHECK (amount > 0),
                description TEXT,
                month TEXT,
                created_at TEXT NOT NULL,

                FOREIGN KEY (goal_id)
                    REFERENCES savings_goals(goal_id)
            )
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_savings_contributions_goal
            ON savings_contributions(goal_id)
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                migration_name TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS user_monthly_data (
                month_name TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cols = [
            row[1]
            for row in connection.execute("PRAGMA table_info(schema_migrations)").fetchall()
        ]
        time_col = "migrated_at" if "migrated_at" in cols else "applied_at"

        migration = connection.execute(
            """
            SELECT migration_name
            FROM schema_migrations
            WHERE migration_name IN ('single_goal_to_multi_goal_v1', 'single_goal_to_multiple_goals_v1')
            """
        ).fetchone()

        if migration is not None:
            connection.execute(
                f"""
                INSERT OR IGNORE INTO schema_migrations (migration_name, {time_col})
                VALUES (?, ?)
                """,
                ("single_goal_to_multiple_goals_v1", get_current_timestamp())
            )
            return

        connection.execute(
            f"""
            INSERT OR IGNORE INTO schema_migrations (
                migration_name,
                {time_col}
            )
            VALUES (?, ?)
            """,
            (
                "single_goal_to_multiple_goals_v1",
                get_current_timestamp()
            )
        )
        connection.execute(
            f"""
            INSERT OR IGNORE INTO schema_migrations (
                migration_name,
                {time_col}
            )
            VALUES (?, ?)
            """,
            (
                "single_goal_to_multi_goal_v1",
                get_current_timestamp()
            )
        )


# =====================================================
# 5. CREATE A NEW SAVINGS GOAL
# =====================================================

def create_savings_goal(
    goal_amount,
    initial_savings,
    db_path=None
):
    """
    Create a new savings goal.
    Only one active goal is allowed at a time.
    """

    if isinstance(goal_amount, bool) or not isinstance(
        goal_amount, (int, float)
    ):
        raise ValueError("Goal amount must be a valid number.")

    if isinstance(initial_savings, bool) or not isinstance(
        initial_savings, (int, float)
    ):
        raise ValueError("Initial savings must be a valid number.")

    if goal_amount <= 0:
        raise ValueError("Savings goal must be greater than zero.")

    if initial_savings < 0:
        raise ValueError("Initial savings cannot be negative.")

    initialize_database(db_path)

    with get_connection(db_path) as connection:

        connection.execute("BEGIN IMMEDIATE")

        active_goal = connection.execute(
            """
            SELECT goal_id
            FROM savings_goals
            WHERE status = 'active'
            """
        ).fetchone()

        if active_goal:
            raise ValueError(
                "An active savings goal already exists. "
                "Complete the existing goal before creating another."
            )

        now = get_current_timestamp()

        initial_status = (
            "completed"
            if initial_savings >= goal_amount
            else "active"
        )

        completed_at = (
            now if initial_status == "completed" else None
        )

        cursor = connection.execute(
            """
            INSERT INTO savings_goals (
                goal_amount,
                initial_savings,
                status,
                created_at,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                goal_amount,
                initial_savings,
                initial_status,
                now,
                completed_at
            )
        )

        goal_id = cursor.lastrowid
        summary = _fetch_savings_summary(connection, goal_id)

    return summary


# =====================================================
# 6. GET THE ACTIVE SAVINGS GOAL
# =====================================================

def get_active_savings_goal(db_path=None):
    """Retrieve the currently active savings goal."""

    initialize_database(db_path)

    with get_connection(db_path) as connection:

        goal = connection.execute(
            """
            SELECT goal_id
            FROM savings_goals
            WHERE status = 'active'
            ORDER BY goal_id DESC
            LIMIT 1
            """
        ).fetchone()

        if goal is None:
            raise ValueError("No active savings goal was found.")

        return _fetch_savings_summary(connection, goal[0])


# =====================================================
# 7. ADD A SAVINGS CONTRIBUTION
# =====================================================

def add_savings_contribution(
    contribution_id,
    contribution_type,
    amount,
    description="",
    month=None,
    goal_id=None,
    db_path=None
):
    """Add a savings contribution to a specific goal."""

    if not isinstance(contribution_id, str) or not contribution_id.strip():
        raise ValueError("Contribution ID cannot be empty.")

    if contribution_type not in ("monthly", "manual"):
        raise ValueError(
            "Contribution type must be 'monthly' or 'manual'."
        )

    if isinstance(amount, bool) or not isinstance(amount, (int, float)):
        raise ValueError("Contribution amount must be a valid number.")

    if amount <= 0:
        raise ValueError("Contribution amount must be greater than zero.")

    if contribution_type == "monthly":
        if not isinstance(month, str) or not month.strip():
            raise ValueError(
                "Month is required for monthly contributions."
            )

    elif contribution_type == "manual" and month is not None:
        raise ValueError(
            "Manual contributions must not contain a month."
        )

    initialize_database(db_path)

    with get_connection(db_path) as connection:

        connection.execute("BEGIN IMMEDIATE")

        # Check duplicate
        existing_contribution = connection.execute(
            """
            SELECT contribution_id, goal_id
            FROM savings_contributions
            WHERE contribution_id = ?
            """,
            (contribution_id.strip(),)
        ).fetchone()

        if existing_contribution:
            associated_goal_id = existing_contribution[1]
            summary = _fetch_savings_summary(connection, associated_goal_id)
            return {
                "status": "duplicate",
                "message": (
                    "This contribution ID already exists. "
                    "It was not added again."
                ),
                "summary": summary
            }

        # Select goal
        if goal_id is None:
            goal = connection.execute(
                """
                SELECT goal_id
                FROM savings_goals
                WHERE status = 'active'
                """
            ).fetchone()

            if goal is None:
                raise ValueError("No active savings goal was found.")

            selected_goal_id = goal[0]
        else:
            selected_goal_id = goal_id

        goal = connection.execute(
            """
            SELECT goal_id, goal_amount, initial_savings, status
            FROM savings_goals
            WHERE goal_id = ?
            """,
            (selected_goal_id,)
        ).fetchone()

        if goal is None:
            raise ValueError("The specified savings goal does not exist.")

        (
            selected_goal_id,
            goal_amount,
            initial_savings,
            status
        ) = goal

        if status == "completed":
            raise ValueError(
                "This savings goal is already completed. "
                "No further contributions are allowed."
            )

        # Record contribution
        connection.execute(
            """
            INSERT INTO savings_contributions (
                contribution_id,
                goal_id,
                contribution_type,
                amount,
                description,
                month,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                contribution_id.strip(),
                selected_goal_id,
                contribution_type,
                amount,
                description,
                month,
                get_current_timestamp()
            )
        )

        # Update status if completed
        contribution_total = connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0)
            FROM savings_contributions
            WHERE goal_id = ?
            """,
            (selected_goal_id,)
        ).fetchone()[0]

        current_savings = initial_savings + contribution_total

        if current_savings >= goal_amount:
            connection.execute(
                """
                UPDATE savings_goals
                SET status = 'completed',
                    completed_at = ?
                WHERE goal_id = ?
                """,
                (
                    get_current_timestamp(),
                    selected_goal_id
                )
            )

        summary = _fetch_savings_summary(connection, selected_goal_id)

    return {
        "status": "success",
        "message": "Savings contribution added successfully.",
        "summary": summary
    }


# =====================================================
# 8. GET SAVINGS SUMMARY
# =====================================================

def get_savings_summary(goal_id=None, db_path=None):
    """Retrieve savings summary for a specific goal or the active goal."""

    initialize_database(db_path)

    with get_connection(db_path) as connection:
        return _fetch_savings_summary(connection, goal_id)


# =====================================================
# 9. GET SAVINGS GOAL HISTORY
# =====================================================

def get_savings_goal_history(db_path=None):
    """Retrieve summaries for all savings goals in order."""

    initialize_database(db_path)

    with get_connection(db_path) as connection:

        goals = connection.execute(
            """
            SELECT goal_id
            FROM savings_goals
            ORDER BY goal_id ASC
            """
        ).fetchall()

        return [
            _fetch_savings_summary(connection, goal[0])
            for goal in goals
        ]


# =====================================================
# 10. BACKWARD-COMPATIBILITY FUNCTION
# =====================================================

def set_savings_goal(goal_amount, initial_savings, db_path=None):
    return create_savings_goal(
        goal_amount=goal_amount,
        initial_savings=initial_savings,
        db_path=db_path
    )


def get_savings_summary_for_database(goal_id, db_path):
    return get_savings_summary(goal_id=goal_id, db_path=db_path)


# =====================================================
# 11. USER-SCOPED MONTHLY DATA PERSISTENCE
# =====================================================

def save_user_month_data(month_name, data_dict, user_id=None):
    """Save or update month record for a specific user in their SQLite database."""
    db_path = get_user_db_path(user_id)
    initialize_database(db_path)
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO user_monthly_data (month_name, data_json, updated_at)
            VALUES (?, ?, ?)
            """,
            (month_name, json.dumps(data_dict), get_current_timestamp())
        )


def get_user_months_data(user_id=None):
    """Retrieve all saved months for a specific user from their SQLite database."""
    db_path = get_user_db_path(user_id)
    initialize_database(db_path)
    with get_connection(db_path) as conn:
        rows = conn.execute(
            "SELECT month_name, data_json FROM user_monthly_data ORDER BY updated_at ASC"
        ).fetchall()
        result = {}
        for row in rows:
            try:
                result[row[0]] = json.loads(row[1])
            except Exception:
                continue
        return result


def delete_user_month_data(month_name, user_id=None):
    """Delete a month record for a user from their SQLite database."""
    db_path = get_user_db_path(user_id)
    initialize_database(db_path)
    with get_connection(db_path) as conn:
        conn.execute("DELETE FROM user_monthly_data WHERE month_name = ?", (month_name,))

