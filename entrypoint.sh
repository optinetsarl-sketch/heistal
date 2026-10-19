#!/bin/bash
set -e

echo "========================================================"
echo "   La Boutique Heistal Togo - Démarrage du Conteneur"
echo "========================================================"

cd /app/backends

# Attente de la base de données PostgreSQL si configurée
if [ -n "$DB_HOST" ] && [ "$DB_ENGINE" != "django.db.backends.sqlite3" ]; then
    echo "-> Vérification de la disponibilité de PostgreSQL sur $DB_HOST:${DB_PORT:-5432}..."
    for i in {1..30}; do
        if python -c "import socket; s = socket.socket(); s.settimeout(2); s.connect(('$DB_HOST', int('${DB_PORT:-5432}'))); s.close()" 2>/dev/null; then
            echo "-> Base de données PostgreSQL connectée !"
            break
        fi
        echo "   En attente de PostgreSQL ($i/30)..."
        sleep 2
    done
fi

# Appliquer les migrations de la base de données
echo "-> [1/3] Application des migrations Django..."
python manage.py migrate --noinput

# Collecter les fichiers statiques de Django (Admin, etc.)
echo "-> [2/3] Collecte des fichiers statiques Django..."
python manage.py collectstatic --noinput --clear || true

# Démarrer Gunicorn en arrière-plan
echo "-> [3/3] Démarrage du serveur WSGI Gunicorn (port 8000)..."
gunicorn config.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 2 \
    --threads 2 \
    --timeout 60 \
    --log-level info &
GUNICORN_PID=$!

# Gestion de l'arrêt propre
cleanup() {
    echo "Arrêt propre des services..."
    kill -TERM "$GUNICORN_PID" 2>/dev/null || true
    nginx -s stop 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

echo "-> Nginx actif et écoute sur les ports 5000 et 80."
nginx -g "daemon off;"
