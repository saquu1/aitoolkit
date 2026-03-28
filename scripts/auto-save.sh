#!/bin/bash
# Auto-Save Script for Container Persistence
# Run this periodically or before container shutdown
#
# This script creates TWO types of backups:
# 1. Git commit - Source code only (small, fast)
# 2. File backup - Database + uploads (in backup/ folder)

PROJECT_DIR="/home/z/my-project"
BACKUP_DIR="/home/z/my-project/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== Auto-Save Started: $TIMESTAMP ==="

# 1. Create backup directory
mkdir -p $BACKUP_DIR

# 2. Git commit (source code ONLY - database and uploads excluded)
cd $PROJECT_DIR
git add -A
git commit -m "Auto-save: $TIMESTAMP" --allow-empty 2>/dev/null || echo "No changes to commit"
echo "✓ Git commit done (source code only)"

# 3. Backup database (NOT in git)
if [ -f "$PROJECT_DIR/db/custom.db" ]; then
  cp $PROJECT_DIR/db/custom.db $BACKUP_DIR/db_$TIMESTAMP.db
  echo "✓ Database backed up: db_$TIMESTAMP.db"
  
  # Keep only last 10 backups
  ls -t $BACKUP_DIR/db_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
fi

# 4. Backup upload folder (NOT in git)
if [ -d "$PROJECT_DIR/upload" ]; then
  tar -czf $BACKUP_DIR/upload_$TIMESTAMP.tar.gz -C $PROJECT_DIR upload 2>/dev/null
  echo "✓ Upload folder backed up: upload_$TIMESTAMP.tar.gz"
  
  # Keep only last 5 backups
  ls -t $BACKUP_DIR/upload_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
fi

# 5. Create full project snapshot (optional, for major milestones)
if [ "$1" = "--full" ]; then
  tar --exclude='node_modules' --exclude='.next' --exclude='backup' \
      -czf $BACKUP_DIR/project_$TIMESTAMP.tar.gz \
      -C $(dirname $PROJECT_DIR) $(basename $PROJECT_DIR) 2>/dev/null
  echo "✓ Full project snapshot: project_$TIMESTAMP.tar.gz"
  
  # Keep only last 3 full snapshots
  ls -t $BACKUP_DIR/project_*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null
fi

# 6. Print summary
echo ""
echo "=== Backup Summary ==="
echo "Git commits: $(git log --oneline | wc -l)"
echo ""
echo "Backup folder:"
ls -lh $BACKUP_DIR/ | tail -10
echo ""
echo "Total backup size: $(du -sh $BACKUP_DIR | cut -f1)"

# 7. If remote git is configured, push
if git remote | grep -q 'origin\|backup'; then
  echo ""
  echo "Pushing to remote..."
  git push --all 2>/dev/null || echo "Push failed - check remote config"
fi

echo ""
echo "=== Auto-Save Complete ==="
echo ""
echo "NOTE: Database and uploads are in backup/ folder (NOT in git)"
echo "To restore: bash scripts/restore.sh"
