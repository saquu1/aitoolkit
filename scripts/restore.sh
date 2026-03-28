#!/bin/bash
# Restore Script - Recover from backup after container reset

PROJECT_DIR="/home/z/my-project"
BACKUP_DIR="/home/z/my-project/backup"

echo "=== Restore Script ==="

# List available backups
echo "Available backups:"
echo ""
ls -lht $BACKUP_DIR/ 2>/dev/null || echo "No backups found!"

echo ""
echo "Usage:"
echo "  1. Full restore:  tar -xzf $BACKUP_DIR/project_YYYYMMDD_HHMMSS.tar.gz -C /"
echo "  2. DB restore:    cp $BACKUP_DIR/db_YYYYMMDD_HHMMSS.db $PROJECT_DIR/db/custom.db"
echo "  3. Upload restore: tar -xzf $BACKUP_DIR/upload_YYYYMMDD_HHMMSS.tar.gz -C $PROJECT_DIR"
echo ""

# If argument provided, restore that backup
if [ -n "$1" ]; then
  BACKUP_FILE="$BACKUP_DIR/$1"
  if [ -f "$BACKUP_FILE" ]; then
    echo "Restoring from: $BACKUP_FILE"
    tar -xzf "$BACKUP_FILE" -C /
    echo "✓ Restore complete!"
  else
    echo "ERROR: Backup file not found: $BACKUP_FILE"
  fi
fi
