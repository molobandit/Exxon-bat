#!/bin/bash
# Affiche l'adresse à taper sur iPhone et démarre le serveur si besoin.
cd "$(dirname "$0")"
PORT=8765
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "IP-INCONNUE")

if ! lsof -i :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Démarrage serveur…"
  python3 -m http.server "$PORT" --bind 0.0.0.0 &
  sleep 1
fi

URL="http://${IP}:${PORT}/m.html"
echo ""
echo "============================================"
echo "  SUR TÉLÉPHONE (Safari ou Chrome), tapez :"
echo ""
echo "  ${URL}"
echo ""
echo "============================================"
echo ""

if command -v open >/dev/null 2>&1; then
  open "http://localhost:${PORT}/m.html"
fi
