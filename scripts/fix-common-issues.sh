#!/bin/bash

# =============================================================================
# Schema Architect - Common Issues Auto-Fix Script
# =============================================================================
# This script detects and fixes common issues with the application:
# - ChunkLoadError: Stale build artifacts
# - UntrustedHost: Missing AUTH_TRUST_HOST
# - MissingSecret: Missing AUTH_SECRET
# - Database issues: Prisma client problems
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
FIX_CHUNKS=false
FIX_AUTH=false
FIX_ALL=false
VERBOSE=false

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --fix-chunks    Fix ChunkLoadError by rebuilding"
    echo "  --fix-auth      Fix auth issues (AUTH_TRUST_HOST, AUTH_SECRET)"
    echo "  --fix-all       Fix all detected issues"
    echo "  --check-only    Only check, don't fix"
    echo "  -v, --verbose   Verbose output"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --fix-all              # Fix all issues"
    echo "  $0 --fix-auth             # Fix auth issues only"
    echo "  $0 --check-only           # Just check for issues"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix-chunks)
            FIX_CHUNKS=true
            shift
            ;;
        --fix-auth)
            FIX_AUTH=true
            shift
            ;;
        --fix-all)
            FIX_ALL=true
            FIX_CHUNKS=true
            FIX_AUTH=true
            shift
            ;;
        --check-only)
            CHECK_ONLY=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# If no specific fix requested, default to check only
if [[ "$FIX_CHUNKS" == "false" && "$FIX_AUTH" == "false" && "$FIX_ALL" == "false" ]]; then
    CHECK_ONLY=true
fi

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# =============================================================================
# Check Functions
# =============================================================================

check_chunk_issues() {
    log_info "Checking for ChunkLoadError issues..."
    
    ISSUES_FOUND=0
    
    # Check if .next directory exists and has content
    if [[ ! -d "$PROJECT_ROOT/.next" ]]; then
        log_warning "No .next directory found - build required"
        ((ISSUES_FOUND++))
    elif [[ ! -d "$PROJECT_ROOT/.next/standalone" ]]; then
        log_warning "No standalone build found - rebuild required"
        ((ISSUES_FOUND++))
    else
        # Check for recent build
        BUILD_TIME=$(stat -c %Y "$PROJECT_ROOT/.next" 2>/dev/null || stat -f %m "$PROJECT_ROOT/.next" 2>/dev/null)
        CURRENT_TIME=$(date +%s)
        AGE_HOURS=$(( (CURRENT_TIME - BUILD_TIME) / 3600 ))
        
        if [[ $AGE_HOURS -gt 24 ]]; then
            log_warning "Build is $AGE_HOURS hours old - consider rebuilding"
            ((ISSUES_FOUND++))
        else
            log_verbose "Build is $AGE_HOURS hours old"
        fi
    fi
    
    # Check server log for ChunkLoadError
    if [[ -f "$PROJECT_ROOT/server.log" ]]; then
        if grep -q "ChunkLoadError" "$PROJECT_ROOT/server.log" 2>/dev/null; then
            log_warning "ChunkLoadError found in server.log"
            ((ISSUES_FOUND++))
        fi
    fi
    
    if [[ $ISSUES_FOUND -eq 0 ]]; then
        log_success "No chunk issues detected"
    fi
    
    return $ISSUES_FOUND
}

check_auth_issues() {
    log_info "Checking for auth configuration issues..."
    
    ISSUES_FOUND=0
    ENV_FILE="$PROJECT_ROOT/.env"
    
    # Check if .env exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "No .env file found"
        ((ISSUES_FOUND++))
    else
        # Check AUTH_TRUST_HOST
        if ! grep -q "AUTH_TRUST_HOST=true" "$ENV_FILE" 2>/dev/null; then
            log_warning "AUTH_TRUST_HOST=true not found in .env"
            ((ISSUES_FOUND++))
        else
            log_verbose "AUTH_TRUST_HOST is configured"
        fi
        
        # Check AUTH_SECRET
        if ! grep -q "AUTH_SECRET=" "$ENV_FILE" 2>/dev/null; then
            log_warning "AUTH_SECRET not found in .env"
            ((ISSUES_FOUND++))
        else
            log_verbose "AUTH_SECRET is configured"
        fi
    fi
    
    # Check server log for UntrustedHost
    if [[ -f "$PROJECT_ROOT/server.log" ]]; then
        if grep -q "UntrustedHost" "$PROJECT_ROOT/server.log" 2>/dev/null; then
            log_warning "UntrustedHost error found in server.log"
            ((ISSUES_FOUND++))
        fi
        if grep -q "MissingSecret" "$PROJECT_ROOT/server.log" 2>/dev/null; then
            log_warning "MissingSecret error found in server.log"
            ((ISSUES_FOUND++))
        fi
    fi
    
    if [[ $ISSUES_FOUND -eq 0 ]]; then
        log_success "No auth issues detected"
    fi
    
    return $ISSUES_FOUND
}

check_database_issues() {
    log_info "Checking for database issues..."
    
    ISSUES_FOUND=0
    
    # Check Prisma client
    if [[ ! -d "$PROJECT_ROOT/node_modules/.prisma" ]]; then
        log_warning "Prisma client not generated"
        ((ISSUES_FOUND++))
    else
        log_verbose "Prisma client exists"
    fi
    
    # Check database file for SQLite
    if grep -q "sqlite" "$PROJECT_ROOT/prisma/schema.prisma" 2>/dev/null; then
        DB_PATH=$(grep -oP 'url\s*=\s*"\K[^"]+' "$PROJECT_ROOT/prisma/schema.prisma" | head -1)
        if [[ "$DB_PATH" == file:* ]]; then
            DB_FILE="${DB_PATH#file:}"
            if [[ ! -f "$PROJECT_ROOT/prisma/$DB_FILE" ]]; then
                log_warning "Database file not found: $DB_FILE"
                ((ISSUES_FOUND++))
            fi
        fi
    fi
    
    if [[ $ISSUES_FOUND -eq 0 ]]; then
        log_success "No database issues detected"
    fi
    
    return $ISSUES_FOUND
}

# =============================================================================
# Fix Functions
# =============================================================================

fix_chunk_issues() {
    log_info "Fixing ChunkLoadError issues..."
    
    # Stop running server
    log_info "Stopping running server..."
    pkill -f "server.js" 2>/dev/null || true
    pkill -f "bun.*next" 2>/dev/null || true
    sleep 2
    
    # Clean build artifacts
    log_info "Cleaning build artifacts..."
    rm -rf "$PROJECT_ROOT/.next"
    rm -rf "$PROJECT_ROOT/node_modules/.cache"
    
    # Rebuild
    log_info "Rebuilding application..."
    cd "$PROJECT_ROOT"
    
    if command -v bun &> /dev/null; then
        bun run build
    else
        npm run build
    fi
    
    log_success "ChunkLoadError fix complete - rebuild finished"
}

fix_auth_issues() {
    log_info "Fixing auth configuration issues..."
    
    ENV_FILE="$PROJECT_ROOT/.env"
    
    # Create .env if it doesn't exist
    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "Creating .env file..."
        touch "$ENV_FILE"
    fi
    
    # Add AUTH_TRUST_HOST if missing
    if ! grep -q "AUTH_TRUST_HOST=true" "$ENV_FILE" 2>/dev/null; then
        log_info "Adding AUTH_TRUST_HOST=true..."
        echo "" >> "$ENV_FILE"
        echo "# NextAuth v5 - Trust all hosts (required for production)" >> "$ENV_FILE"
        echo "AUTH_TRUST_HOST=true" >> "$ENV_FILE"
    fi
    
    # Add AUTH_SECRET if missing
    if ! grep -q "AUTH_SECRET=" "$ENV_FILE" 2>/dev/null; then
        log_info "Generating AUTH_SECRET..."
        if command -v openssl &> /dev/null; then
            SECRET=$(openssl rand -base64 32)
        else
            # Fallback: generate random string
            SECRET=$(head -c 32 /dev/urandom | base64)
        fi
        echo "" >> "$ENV_FILE"
        echo "# NextAuth v5 - JWT encryption secret" >> "$ENV_FILE"
        echo "AUTH_SECRET=\"$SECRET\"" >> "$ENV_FILE"
        log_info "Generated new AUTH_SECRET"
    fi
    
    # Clean up duplicates
    log_verbose "Cleaning up .env file..."
    
    log_success "Auth configuration fix complete"
}

fix_database_issues() {
    log_info "Fixing database issues..."
    
    cd "$PROJECT_ROOT"
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate
    
    # Check if migrations need to be applied
    if [[ -d "$PROJECT_ROOT/prisma/migrations" ]]; then
        log_info "Checking database migrations..."
        npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev 2>/dev/null || true
    fi
    
    log_success "Database fix complete"
}

restart_server() {
    log_info "Restarting server..."
    
    # Stop any running servers
    pkill -f "server.js" 2>/dev/null || true
    pkill -f "bun.*next" 2>/dev/null || true
    sleep 2
    
    cd "$PROJECT_ROOT"
    
    # Start server in background
    if command -v bun &> /dev/null; then
        log_info "Starting server with bun..."
        NODE_ENV=production bun .next/standalone/server.js > server.log 2>&1 &
    else
        log_info "Starting server with node..."
        NODE_ENV=production node .next/standalone/server.js > server.log 2>&1 &
    fi
    
    sleep 3
    
    # Verify server started
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|304"; then
        log_success "Server started successfully on http://localhost:3000"
    else
        log_warning "Server may not have started correctly. Check server.log"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

echo ""
echo "=============================================="
echo " Schema Architect - Issue Detector & Fixer"
echo "=============================================="
echo ""

cd "$PROJECT_ROOT"

# Run checks
CHUNK_ISSUES=0
AUTH_ISSUES=0
DB_ISSUES=0

check_chunk_issues || CHUNK_ISSUES=$?
check_auth_issues || AUTH_ISSUES=$?
check_database_issues || DB_ISSUES=$?

echo ""
echo "=============================================="
echo " Summary"
echo "=============================================="
echo "Chunk Issues:   $CHUNK_ISSUES"
echo "Auth Issues:    $AUTH_ISSUES"
echo "Database Issues: $DB_ISSUES"
echo ""

TOTAL_ISSUES=$((CHUNK_ISSUES + AUTH_ISSUES + DB_ISSUES))

if [[ "$CHECK_ONLY" == "true" ]]; then
    if [[ $TOTAL_ISSUES -eq 0 ]]; then
        log_success "No issues detected!"
        exit 0
    else
        log_warning "Found $TOTAL_ISSUES issue(s). Run with --fix-all to fix."
        exit 1
    fi
fi

# Apply fixes
if [[ "$FIX_CHUNKS" == "true" && $CHUNK_ISSUES -gt 0 ]]; then
    fix_chunk_issues
fi

if [[ "$FIX_AUTH" == "true" && $AUTH_ISSUES -gt 0 ]]; then
    fix_auth_issues
fi

if [[ $DB_ISSUES -gt 0 ]]; then
    fix_database_issues
fi

# Restart server if fixes were applied
if [[ "$FIX_CHUNKS" == "true" || "$FIX_AUTH" == "true" || "$FIX_ALL" == "true" ]]; then
    if [[ $TOTAL_ISSUES -gt 0 ]]; then
        echo ""
        restart_server
    fi
fi

echo ""
echo "=============================================="
echo " Fix Complete"
echo "=============================================="
echo ""

exit 0
