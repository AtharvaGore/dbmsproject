#!/usr/bin/env bash
# =============================================================================
# db/tools/setup.sh
# Owner: Bhooshan Deshpande (Member B)
#
# One-command database build for a local PostgreSQL 16 + pgvector install.
#
#   ./db/tools/setup.sh            # create the database (if missing) and build it
#   ./db/tools/setup.sh --reset    # wipe the existing schema first, then build
#
# Run as a PostgreSQL superuser. psql picks up the connection from the usual
# libpq variables (PGHOST, PGPORT, PGUSER, PGPASSWORD), so either:
#   sudo -u postgres createuser --superuser "$USER"   # once, then run as yourself
# or export PGUSER=postgres PGPASSWORD=... before running it.
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

die() { echo "setup.sh: $*" >&2; exit 1; }

# --- arguments ---------------------------------------------------------------
RESET=false
for arg in "$@"; do
    case "$arg" in
        --reset) RESET=true ;;
        -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
        *) die "unknown argument: $arg (expected --reset)" ;;
    esac
done

# --- 1. load .env ------------------------------------------------------------
[[ -f "$ENV_FILE" ]] || die ".env not found at $ENV_FILE. Run: cp .env.example .env and fill it in."
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${DB_NAME:?DB_NAME is not set in .env}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is not set in .env}"
[[ "$DB_NAME" =~ ^[a-z_][a-z0-9_]*$ ]] || die "DB_NAME must be lowercase letters, digits and _ (got '$DB_NAME')"
if [[ "$APP_DB_PASSWORD" == "change_me" ]]; then
    echo "setup.sh: warning: APP_DB_PASSWORD is still the placeholder 'change_me'" >&2
fi

PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -d postgres -tAc "SELECT 1" >/dev/null \
    || die "cannot connect to PostgreSQL. Is the server running, and are you a superuser?"

# --- 2. optional reset -------------------------------------------------------
db_exists() {
    [[ "$("${PSQL[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" == "1" ]]
}

if $RESET && db_exists; then
    echo "==> Resetting schema in $DB_NAME (all data will be lost)"
    "${PSQL[@]}" -d "$DB_NAME" -f "$REPO_ROOT/db/tools/reset.sql"
fi

# --- 3. create the database --------------------------------------------------
if db_exists; then
    echo "==> Database $DB_NAME already exists"
else
    echo "==> Creating database $DB_NAME"
    createdb "$DB_NAME"
fi

# --- 4. pgvector must be installed on the server -----------------------------
if [[ "$("${PSQL[@]}" -d "$DB_NAME" -tAc "SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")" != "1" ]]; then
    echo "pgvector is not installed. On Ubuntu/Debian: sudo apt install postgresql-16-pgvector" >&2
    exit 1
fi

# --- 5. build ----------------------------------------------------------------
echo "==> Building schema, seed data, logic and security (db/tools/init.sql)"
if ! "${PSQL[@]}" -d "$DB_NAME" -f "$REPO_ROOT/db/tools/init.sql"; then
    die "build failed (see the error above). If tables already exist, rerun with --reset."
fi

# --- 6. real password for the app login role ---------------------------------
# \getenv reads the password from the environment, so it never appears on the
# command line (ps) and :'pw' quotes it safely as a SQL literal.
"${PSQL[@]}" -d "$DB_NAME" <<'SQL'
\getenv pw APP_DB_PASSWORD
ALTER ROLE academiaos_app PASSWORD :'pw';
SQL
echo "==> Password set for login role academiaos_app"

# --- 7. next steps -----------------------------------------------------------
cat <<NEXT

Database $DB_NAME is ready.

Next steps:
  python3 -m venv .venv && . .venv/bin/activate
  pip install -r flask_backend/requirements.txt
  python flask_backend/app.py                 # API on port ${FLASK_PORT:-5000}
  cd nextjs_frontend && npm install && npm run dev

Demo logins (DEMO DATA ONLY, password Demo@123):
  Student  atharva / bhooshan accounts from 03_A_seed.sql
  Admin    admin account from 03_A_seed.sql

Run the tests:   ./db/tools/run_tests.sh
NEXT
