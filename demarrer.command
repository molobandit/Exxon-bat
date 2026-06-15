#!/bin/bash
cd "$(dirname "$0")"

PORT=8765

if lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Le serveur tourne déjà sur le port $PORT."
else
  echo "Démarrage du serveur Exxon-bat sur http://localhost:$PORT …"
  python3 -m http.server "$PORT" --bind 0.0.0.0 &
  sleep 1
fi

open "http://localhost:$PORT/"
echo "Appuyez sur Entrée pour fermer cette fenêtre (le serveur continue en arrière-plan)."
read -r
