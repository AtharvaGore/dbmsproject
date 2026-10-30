#!/usr/bin/env bash
# =============================================================================
# db/tools/run_tests.sh
# Owner: Bhooshan Deshpande (Member B)
#
# Runs the SQL test files against a built database and prints their PASS/FAIL
# tables. Exits 1 if any test fails or a file errors out. The tests roll back,
# so the database is unchanged afterwards.
#
#   ./db/tools/run_tests.sh              # database from $DB_NAME in .env
#   ./db/tools/run_tests.sh mydb         # or name it explicitly
#
# Connects with the usual libpq variables (PGHOST, PGUSER, ...) as a superuser
# or the database owner, like setup.sh.
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -f "$REPO_ROOT/.env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$REPO_ROOT/.env"
    set +a
fi

DB="${1:-${DB_NAME:-${PGDATABASE:-}}}"
[[ -n "$DB" ]] || { echo "run_tests.sh: no database given (pass one, or set DB_NAME in .env)" >&2; exit 1; }

status=0
ran=0
for f in "$REPO_ROOT/db/tests/A_tests.sql" "$REPO_ROOT/db/tests/B_tests.sql"; do
    [[ -f "$f" ]] || continue
    ran=$((ran + 1))
    echo "==> ${f#"$REPO_ROOT"/}"
    if ! out="$(psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1)"; then
        echo "$out"
        echo "ERROR: ${f##*/} stopped with an error" >&2
        status=1
        continue
    fi
    echo "$out"
    if grep -qE '\|[[:space:]]*FAIL[[:space:]]*\|' <<<"$out"; then
        echo "FAILED: ${f##*/} has failing tests" >&2
        status=1
    fi
done

[[ $ran -gt 0 ]] || { echo "run_tests.sh: no test files found in db/tests/" >&2; exit 1; }
[[ $status -eq 0 ]] && echo "All tests passed."
exit $status
