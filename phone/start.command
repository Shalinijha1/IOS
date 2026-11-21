#!/usr/bin/env sh
# Start Glassline OS on http://localhost:8080 (camera, microphone and offline mode need http, not file://).
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Glassline OS: open http://localhost:$PORT in Chrome, Edge, Safari or Firefox. Ctrl+C to stop."
( sleep 1; (command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT") || (command -v open >/dev/null && open "http://localhost:$PORT") ) >/dev/null 2>&1 &
exec python3 -m http.server "$PORT"
