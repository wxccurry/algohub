#!/bin/bash
# In-container Java judge script.
# Reads /judge/Solution.java, compiles it, runs against each test case.

set -e

CODE_FILE="/judge/Solution.java"
TESTS_FILE="/judge/tests.json"
TIME_LIMIT="${TIME_LIMIT:-5}"

if [ ! -f "$CODE_FILE" ]; then
    echo '[{"case":1,"status":"SE","message":"代码文件未找到"}]'
    exit 0
fi

# The class name must be "Solution"
if ! grep -q "class Solution" "$CODE_FILE"; then
    echo '[{"case":1,"status":"CE","message":"类名必须为 Solution（public class Solution）"}]'
    exit 0
fi

# Compile
if ! javac "$CODE_FILE" 2>/tmp/compile_err.txt; then
    ERR=$(cat /tmp/compile_err.txt | head -c 300)
    echo "[{\"case\":1,\"status\":\"CE\",\"message\":\"$(echo "$ERR" | sed 's/"/\\"/g')\"}]"
    exit 0
fi

# Run tests
RESULTS="["
FIRST=true

if [ -f "$TESTS_FILE" ]; then
    CASE_COUNT=$(python3 -c "import json; print(len(json.load(open('$TESTS_FILE'))))" 2>/dev/null || echo 1)
else
    CASE_COUNT=1
fi

for i in $(seq 1 $CASE_COUNT); do
    if [ -f "$TESTS_FILE" ]; then
        IDX=$((i - 1))
        INPUT=$(python3 -c "import json; tc=json.load(open('$TESTS_FILE'))[$IDX]; print(tc.get('input',''))")
        EXPECTED=$(python3 -c "import json; tc=json.load(open('$TESTS_FILE'))[$IDX]; print(tc.get('output',''))" | sed 's/[[:space:]]*$//')
    else
        INPUT=""
        EXPECTED=""
    fi

    ACTUAL=$(echo "$INPUT" | timeout "$TIME_LIMIT" java -cp /judge Solution 2>/tmp/run_err.txt) || RUN_EXIT=$?
    ACTUAL_CLEAN=$(echo "$ACTUAL" | sed 's/[[:space:]]*$//')

    STATUS="AC"
    MSG=""
    if [ "${RUN_EXIT:-0}" -eq 124 ]; then
        STATUS="TLE"
        MSG="超时"
    elif [ "${RUN_EXIT:-0}" -ne 0 ]; then
        STATUS="RE"
        MSG=$(head -c 200 /tmp/run_err.txt)
    elif [ "$ACTUAL_CLEAN" != "$EXPECTED" ]; then
        STATUS="WA"
        MSG="expected: ${EXPECTED:0:100}, got: ${ACTUAL_CLEAN:0:100}"
    fi

    [ "$FIRST" = true ] && FIRST=false || RESULTS+=","
    MSG_ESC=$(echo "$MSG" | sed 's/"/\\"/g')
    RESULTS+="{\"case\":$i,\"status\":\"$STATUS\",\"message\":\"$MSG_ESC\"}"
done

RESULTS+="]"
echo "$RESULTS"
