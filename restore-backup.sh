#!/bin/bash
# =============================================================================
# BACKUP RESTORE SCRIPT
# Usage: ./restore-backup.sh <backup-file.tar.gz>
# =============================================================================

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-backup.sh <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh download/backup-*.tar.gz 2>/dev/null || echo "No backups found in download/"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📦 Restoring from: $BACKUP_FILE"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo "📂 Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR")

# Show backup info
if [ -f "$TEMP_DIR/$BACKUP_DIR/backup-info.txt" ]; then
    echo "📄 Backup Info:"
    cat "$TEMP_DIR/$BACKUP_DIR/backup-info.txt"
    echo ""
fi

# Confirm restore
read -p "Continue with restore? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Restore database
if [ -f "$TEMP_DIR/$BACKUP_DIR/database.db" ]; then
    echo "🗄️ Restoring database..."
    mkdir -p db
    cp "$TEMP_DIR/$BACKUP_DIR/database.db" db/custom.db
    echo "✅ Database restored: $(du -h db/custom.db | cut -f1)"
fi

# Restore git
if [ -f "$TEMP_DIR/$BACKUP_DIR/repo.bundle" ]; then
    echo "🔄 Restoring git repository..."
    
    # Create new repo from bundle if .git doesn't exist
    if [ ! -d ".git" ]; then
        git init
    fi
    
    # Fetch from bundle
    git fetch "$TEMP_DIR/$BACKUP_DIR/repo.bundle" '*:*' 2>/dev/null || true
    echo "✅ Git repository restored"
fi

echo ""
echo "✅ Restore complete!"
