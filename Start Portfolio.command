#!/bin/bash
# ============================================================
# Start Portfolio — double-click to launch the site properly.
# Serves over http://localhost so the ASCII Cam camera works.
# Press Ctrl+C in this window to stop the server.
# ============================================================
cd "$(dirname "$0")" || exit 1

PORT=8137
# if the port is taken (e.g. an earlier run), pick the next free one
while lsof -i ":$PORT" >/dev/null 2>&1; do PORT=$((PORT+1)); done

( sleep 1; open "http://localhost:$PORT" ) &

echo "✳ Serving your portfolio at http://localhost:$PORT"
echo "  Keep this window open. Press Ctrl+C to stop."
python3 -m http.server "$PORT"

echo ""
echo "Server stopped (or failed to start — is Python 3 installed?)."
read -n 1 -s -r -p "Press any key to close this window…"
