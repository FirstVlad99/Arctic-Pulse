#!/bin/bash
set -e

echo "Starting workflow import process..."

# Ждем пока n8n полностью запустится
sleep 20

# Импортируем все workflow из папки workflows
if [ -d "/home/node/.n8n/workflows" ]; then
    for workflow_file in /home/node/.n8n/workflows/*.json; do
        if [ -f "$workflow_file" ]; then
            echo "Importing workflow: $workflow_file"
            n8n import:workflow --input="$workflow_file" || echo "Failed to import $workflow_file"
        fi
    done
    echo "Workflow import process completed!"
else
    echo "Workflows directory not found!"
fi

# Запускаем основной процесс n8n
exec n8n start