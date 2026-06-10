#!/bin/bash

# Загрузка переменных окружения (правильный способ для Docker)
if [ -f /app/.env ]; then
    export $(grep -v '^#' /app/.env | xargs)
fi

# Используем переменные из Docker environment
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
DB_NAME=${DB_NAME:-arc}
DB_USER=${DB_USER:-aaa}
DB_PASSWORD=${DB_PASSWORD:-aaa}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
DIRECTUS_PORT=${DIRECTUS_PORT:-8055}

echo "=== Starting Directus Schema Setup ==="
echo "PostgreSQL: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $DB_NAME"

# Функция ожидания PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if PGPASSWORD=$DB_PASSWORD pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "Attempt $i/30: PostgreSQL not ready yet..."
    sleep 2
done

# ============================================
# СОЗДАНИЕ БАЗЫ ДАННЫХ ЕСЛИ ОНА НЕ СУЩЕСТВУЕТ
# ============================================
echo "=== Checking if database $DB_NAME exists ==="
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "postgres" -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database $DB_NAME already exists"
else
    echo "📝 Creating database $DB_NAME..."
    PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME;"
    if [ $? -eq 0 ]; then
        echo "✅ Database $DB_NAME created successfully"
    else
        echo "❌ Failed to create database $DB_NAME"
        exit 1
    fi
fi

# Функция ожидания Directus
echo "Waiting for Directus to be ready..."
for i in {1..30}; do
    if curl -s "http://directus:$DIRECTUS_PORT/server/info" > /dev/null 2>&1; then
        echo "✅ Directus is ready!"
        break
    fi
    echo "Attempt $i/30: Directus not ready yet..."
    sleep 2
done

# ============================================
# ВАЖНО: Ждём пока Directus создаст свои таблицы
# ============================================
echo "Waiting for Directus to create its system tables..."
for i in {1..120}; do
    # Проверяем наличие любой системной таблицы Directus
    SYS_TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'directus_%' AND table_schema = 'public'")
    if [ "$SYS_TABLES" -gt 10 ]; then
        echo "✅ Directus system tables created ($SYS_TABLES tables)"
        break
    fi
    echo "Attempt $i/120: Waiting for Directus system tables... (found $SYS_TABLES)"
    sleep 2
done

# Дополнительная задержка
sleep 5

# ============================================
# Выполнение db_init.sql
# ============================================
echo "=== Executing db_init.sql ==="
if [ -f "/app/db_init.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -f "/app/db_init.sql"
    if [ $? -eq 0 ]; then
        echo "✅ db_init.sql executed successfully"
    else
        echo "❌ Failed to execute db_init.sql"
        exit 1
    fi
else
    echo "⚠️ db_init.sql not found at /app/db_init.sql"
fi

# ============================================
# Выполнение functions_triggers_init.sql
# ============================================
echo "=== Executing functions_triggers_init.sql ==="
if [ -f "/app/functions_triggers_init.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -f "/app/functions_triggers_init.sql"
    if [ $? -eq 0 ]; then
        echo "✅ functions_triggers_init.sql executed successfully"
    else
        echo "❌ Failed to execute functions_triggers_init.sql"
        exit 1
    fi
else
    echo "⚠️ functions_triggers_init.sql not found at /app/functions_triggers_init.sql"
fi

# Проверяем какой файл схемы существует
SCHEMA_FILE=""
if [ -f "/app/register-collections.sql" ]; then
    SCHEMA_FILE="/app/register-collections.sql"
    echo "Found SQL schema file: $SCHEMA_FILE"
elif [ -f "/directus/register-collections.sql" ]; then
    SCHEMA_FILE="/directus/register-collections.sql"
    echo "Found SQL schema file: $SCHEMA_FILE"
else
    echo "❌ No schema file found!"
    ls -la /app/ /directus/ 2>/dev/null || echo "Directories empty"
    exit 1
fi

# Применяем SQL схему
echo "=== Registering collections in Directus ==="
PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Collections registered successfully via SQL!"
else
    echo "❌ Failed to register collections via SQL"
    exit 1
fi

# Также пробуем применить YAML схему через Directus CLI (если есть)
if [ -f "/app/schema.yaml" ] || [ -f "/directus/schema.yaml" ]; then
    echo "Trying to apply YAML schema via Directus CLI..."
    
    YAML_SCHEMA=""
    if [ -f "/app/schema.yaml" ]; then
        YAML_SCHEMA="/app/schema.yaml"
    else
        YAML_SCHEMA="/directus/schema.yaml"
    fi
    
    # Устанавливаем directus CLI глобально
    npm install -g directus
    
    # Применяем схему
    cd /app
    npx directus schema apply --yes "$YAML_SCHEMA" 2>/dev/null || echo "⚠️ YAML schema apply failed (may be normal if already applied)"
fi

# ============================================
# НАСТРОЙКА ПУБЛИЧНОГО ДОСТУПА (полная версия)
# ============================================
echo "=== Setting up public access permissions ==="

# Получаем ID публичной роли
PUBLIC_ROLE_ID=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT id FROM directus_roles WHERE name = 'Public' LIMIT 1")

if [ -z "$PUBLIC_ROLE_ID" ]; then
    echo "Creating Public role..."
    PUBLIC_ROLE_ID=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "INSERT INTO directus_roles (name, admin_access, app_access) VALUES ('Public', false, false) RETURNING id;")
    echo "✅ Public role created with ID: $PUBLIC_ROLE_ID"
else
    echo "✅ Public role found with ID: $PUBLIC_ROLE_ID"
fi

# Все коллекции, включая системные junction tables
ALL_COLLECTIONS=(
    "news"
    "sources" 
    "tags"
    "digests"
    "news_stats"
    "news_reactions"
    "digest_news"
    # Junction tables для отношений many-to-many
    "news_tags"  # связь между news и tags
    "directus_activity"  # может понадобиться для некоторых запросов
)

# Действия для каждой коллекции
for COLLECTION in "${ALL_COLLECTIONS[@]}"; do
    # Проверяем существует ли коллекция
    COLLECTION_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$COLLECTION' AND table_schema = 'public'")
    
    if [ "$COLLECTION_EXISTS" -eq 0 ]; then
        echo "⚠️ Collection $COLLECTION does not exist, skipping..."
        continue
    fi
    
    # Добавляем read permission
    PERM_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM directus_permissions WHERE role = '$PUBLIC_ROLE_ID' AND collection = '$COLLECTION' AND action = 'read'")
    
    if [ "$PERM_EXISTS" -eq 0 ]; then
        echo "Adding read permission for collection: $COLLECTION"
        PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO directus_permissions (role, collection, action, permissions, fields) VALUES ('$PUBLIC_ROLE_ID', '$COLLECTION', 'read', '{}', '*');"
    fi
done

# Для news_reactions добавляем create и delete
for ACTION in "create" "delete"; do
    PERM_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM directus_permissions WHERE role = '$PUBLIC_ROLE_ID' AND collection = 'news_reactions' AND action = '$ACTION'")
    
    if [ "$PERM_EXISTS" -eq 0 ]; then
        echo "Adding $ACTION permission for collection: news_reactions"
        PGPASSWORD=$DB_PASSWORD psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO directus_permissions (role, collection, action, permissions, fields) VALUES ('$PUBLIC_ROLE_ID', 'news_reactions', '$ACTION', '{}', '*');"
    fi
done

echo "✅ Public access permissions configured"

echo "=== Setup completed! ==="