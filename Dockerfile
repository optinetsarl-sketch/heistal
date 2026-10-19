# ==============================================================================
# ÉTAPE 1 : Build du Frontend React (Vite)
# Optimisation multi-plateforme : exécution native de Node.js via $BUILDPLATFORM
# pour une compilation rapide même lors du cross-building vers ARM64
# ==============================================================================
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copie des fichiers de dépendances npm
COPY frontend/frontend/package*.json ./

# Installation des dépendances
RUN npm ci || npm install

# Copie des sources du frontend
COPY frontend/frontend/ ./

# Compilation des assets statiques pour la production (sortie dans /app/frontend/dist)
RUN npm run build

# ==============================================================================
# ÉTAPE 2 : Runtime Python Django + Nginx (Fullstack Container)
# Compatible nativement avec linux/arm64 et linux/amd64
# ==============================================================================
FROM python:3.11-slim

# Variables d'environnement pour Python, Django et Nginx
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=80

# Installation de Nginx et des outils système
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copie et installation des dépendances Python
COPY backends/requirements.txt /app/backends/requirements.txt
RUN pip install --no-cache-dir -r /app/backends/requirements.txt

# Copie du backend Django
COPY backends/ /app/backends/

# Copie des fichiers compilés du frontend depuis l'étape 1
COPY --from=frontend-builder /app/frontend/dist /var/www/frontend

# Configuration Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Script d'entrée pour démarrer Gunicorn et Nginx
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Ports web exposés (5000 et 80)
EXPOSE 5000 80

# Commande de démarrage
ENTRYPOINT ["/app/entrypoint.sh"]
