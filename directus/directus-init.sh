#!/bin/bash

# Загрузка переменных
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
DB_NAME=${DB_NAME:-arc}
DB_USER=${DB_USER:-aaa}
DB_PASSWORD=${DB_PASSWORD:-aaa}
DIRECTUS_PORT=${DIRECTUS_PORT:-8055}

echo "=== Starting Directus CLI Setup ==="

# Ждем Directus
echo "Waiting for Directus to be ready..."
for i in {1..30}; do
    if curl -s "http://directus:$DIRECTUS_PORT/server/info" > /dev/null 2>&1; then
        echo "✅ Directus is ready!"
        break
    fi
    sleep 2
done

# Проверяем наличие schema.yaml
if [ -f "/app/schema.yaml" ]; then
    echo "Found schema.yaml at /app/schema.yaml"
    
    # Устанавливаем directus CLI
    npm install -g directus
    
    # Применяем схему
    echo "Applying schema..."
    cd /app
    npx directus schema apply --yes /app/schema.yaml
    
    if [ $? -eq 0 ]; then
        echo "✅ Schema applied successfully!"
    else
        echo "❌ Failed to apply schema"
        exit 1
    fi
else
    echo "⚠️ schema.yaml not found at /app/schema.yaml"
    echo "Available files in /app:"
    ls -la /app/
fi

echo "=== Directus CLI Setup completed! ==="