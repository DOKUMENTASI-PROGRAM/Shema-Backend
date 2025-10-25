#!/bin/bash

# Feature Flags Management Script for Shema Music Backend
# This script manages feature flags for safe feature rollout and A/B testing

set -e

# Configuration
FEATURE_FLAGS_FILE="config/feature-flags.json"
BACKUP_SUFFIX=".backup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to initialize feature flags file
init_feature_flags() {
    log_info "Initializing feature flags configuration..."

    mkdir -p config

    cat > "$FEATURE_FLAGS_FILE" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "",
  "flags": {
    "recommendation_engine_v2": {
      "enabled": false,
      "description": "New recommendation engine with AI-powered suggestions",
      "rollout_percentage": 0,
      "target_users": [],
      "conditions": {
        "user_type": ["premium"],
        "environment": ["staging", "production"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "advanced_booking_conflict_detection": {
      "enabled": true,
      "description": "Enhanced conflict detection for overlapping bookings",
      "rollout_percentage": 100,
      "target_users": [],
      "conditions": {
        "environment": ["development", "staging", "production"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "real_time_notifications": {
      "enabled": false,
      "description": "Real-time push notifications for booking updates",
      "rollout_percentage": 0,
      "target_users": [],
      "conditions": {
        "user_type": ["all"],
        "environment": ["staging"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "payment_integration": {
      "enabled": false,
      "description": "Integrated payment processing for bookings",
      "rollout_percentage": 0,
      "target_users": ["admin@shemamusic.com"],
      "conditions": {
        "environment": ["staging"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "analytics_dashboard": {
      "enabled": true,
      "description": "Advanced analytics dashboard for administrators",
      "rollout_percentage": 100,
      "target_users": [],
      "conditions": {
        "user_type": ["admin"],
        "environment": ["production"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "bulk_operations": {
      "enabled": false,
      "description": "Bulk operations for slot management",
      "rollout_percentage": 50,
      "target_users": [],
      "conditions": {
        "user_type": ["admin"],
        "environment": ["staging", "production"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "api_rate_limiting": {
      "enabled": true,
      "description": "Advanced rate limiting for API endpoints",
      "rollout_percentage": 100,
      "target_users": [],
      "conditions": {
        "environment": ["development", "staging", "production"]
      },
      "created_at": "",
      "updated_at": ""
    },
    "caching_layer_optimization": {
      "enabled": true,
      "description": "Optimized Redis caching strategies",
      "rollout_percentage": 100,
      "target_users": [],
      "conditions": {
        "environment": ["production"]
      },
      "created_at": "",
      "updated_at": ""
    }
  }
}
EOF

    # Update timestamps
    update_timestamps

    log_success "Feature flags configuration initialized"
}

# Function to update timestamps
update_timestamps() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Update last_updated
    if command -v jq >/dev/null 2>&1; then
        jq --arg timestamp "$timestamp" '.last_updated = $timestamp' "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"

        # Update individual flag timestamps
        for flag in $(jq -r '.flags | keys[]' "$FEATURE_FLAGS_FILE"); do
            if [ "$(jq -r ".flags.\"$flag\".created_at" "$FEATURE_FLAGS_FILE")" = "" ]; then
                jq --arg flag "$flag" --arg timestamp "$timestamp" ".flags.\"\$flag\".created_at = \$timestamp | .flags.\"\$flag\".updated_at = \$timestamp" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            else
                jq --arg flag "$flag" --arg timestamp "$timestamp" ".flags.\"\$flag\".updated_at = \$timestamp" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            fi
        done
    else
        log_warning "jq not found - timestamps not updated. Install jq for better JSON handling."
    fi
}

# Function to list all feature flags
list_flags() {
    log_info "Current feature flags:"

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    echo "=================================================================================="
    printf "%-35s %-8s %-12s %-s\n" "FEATURE FLAG" "ENABLED" "ROLLOUT %" "DESCRIPTION"
    echo "=================================================================================="

    if command -v jq >/dev/null 2>&1; then
        jq -r '.flags | to_entries[] | [.key, .value.enabled, .value.rollout_percentage, .value.description] | @tsv' "$FEATURE_FLAGS_FILE" | \
        while IFS=$'\t' read -r flag enabled percentage description; do
            printf "%-35s %-8s %-12s %-s\n" "$flag" "$enabled" "$percentage%" "$description"
        done
    else
        # Fallback without jq
        grep -A 2 '"enabled"' "$FEATURE_FLAGS_FILE" | grep -E '(enabled|description)' | paste - - | sed 's/.*"enabled": \([^,]*\).*description": "\([^"]*\)".*/\1 \2/'
    fi

    echo "=================================================================================="
}

# Function to enable a feature flag
enable_flag() {
    local flag_name=$1
    local rollout_percentage=${2:-100}

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            jq --arg flag "$flag_name" --arg percentage "$rollout_percentage" ".flags.\"\$flag\".enabled = true | .flags.\"\$flag\".rollout_percentage = (\$percentage | tonumber)" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            update_timestamps
            log_success "Feature flag '$flag_name' enabled with $rollout_percentage% rollout"
        else
            log_error "Feature flag '$flag_name' not found"
            exit 1
        fi
    else
        log_error "jq required for flag management. Please install jq."
        exit 1
    fi
}

# Function to disable a feature flag
disable_flag() {
    local flag_name=$1

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            jq --arg flag "$flag_name" ".flags.\"\$flag\".enabled = false | .flags.\"\$flag\".rollout_percentage = 0" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            update_timestamps
            log_success "Feature flag '$flag_name' disabled"
        else
            log_error "Feature flag '$flag_name' not found"
            exit 1
        fi
    else
        log_error "jq required for flag management. Please install jq."
        exit 1
    fi
}

# Function to update rollout percentage
update_rollout() {
    local flag_name=$1
    local percentage=$2

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if ! [[ "$percentage" =~ ^[0-9]+$ ]] || [ "$percentage" -gt 100 ]; then
        log_error "Invalid percentage. Must be a number between 0 and 100."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            jq --arg flag "$flag_name" --arg percentage "$percentage" ".flags.\"\$flag\".rollout_percentage = (\$percentage | tonumber)" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            update_timestamps
            log_success "Feature flag '$flag_name' rollout updated to $percentage%"
        else
            log_error "Feature flag '$flag_name' not found"
            exit 1
        fi
    else
        log_error "jq required for flag management. Please install jq."
        exit 1
    fi
}

# Function to add a new feature flag
add_flag() {
    local flag_name=$1
    local description=$2

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            log_error "Feature flag '$flag_name' already exists"
            exit 1
        fi

        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

        jq --arg flag "$flag_name" --arg desc "$description" --arg timestamp "$timestamp" ".flags.\"\$flag\"] = {
            \"enabled\": false,
            \"description\": \$desc,
            \"rollout_percentage\": 0,
            \"target_users\": [],
            \"conditions\": {
                \"environment\": [\"development\"]
            },
            \"created_at\": \$timestamp,
            \"updated_at\": \$timestamp
        }" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"

        update_timestamps
        log_success "Feature flag '$flag_name' added"
    else
        log_error "jq required for flag management. Please install jq."
        exit 1
    fi
}

# Function to remove a feature flag
remove_flag() {
    local flag_name=$1

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            jq --arg flag "$flag_name" "del(.flags.\"\$flag\")" "$FEATURE_FLAGS_FILE" > "${FEATURE_FLAGS_FILE}.tmp" && mv "${FEATURE_FLAGS_FILE}.tmp" "$FEATURE_FLAGS_FILE"
            update_timestamps
            log_success "Feature flag '$flag_name' removed"
        else
            log_error "Feature flag '$flag_name' not found"
            exit 1
        fi
    else
        log_error "jq required for flag management. Please install jq."
        exit 1
    fi
}

# Function to backup feature flags
backup_flags() {
    if [ -f "$FEATURE_FLAGS_FILE" ]; then
        cp "$FEATURE_FLAGS_FILE" "${FEATURE_FLAGS_FILE}${BACKUP_SUFFIX}"
        log_success "Feature flags backed up to ${FEATURE_FLAGS_FILE}${BACKUP_SUFFIX}"
    else
        log_error "Feature flags file not found"
        exit 1
    fi
}

# Function to restore feature flags
restore_flags() {
    if [ -f "${FEATURE_FLAGS_FILE}${BACKUP_SUFFIX}" ]; then
        cp "${FEATURE_FLAGS_FILE}${BACKUP_SUFFIX}" "$FEATURE_FLAGS_FILE"
        log_success "Feature flags restored from backup"
    else
        log_error "Backup file not found"
        exit 1
    fi
}

# Function to validate feature flags file
validate_flags() {
    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found"
        return 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq empty "$FEATURE_FLAGS_FILE" 2>/dev/null; then
            log_success "Feature flags file is valid JSON"
            return 0
        else
            log_error "Feature flags file contains invalid JSON"
            return 1
        fi
    else
        log_warning "jq not available - skipping JSON validation"
        return 0
    fi
}

# Function to show flag details
show_flag() {
    local flag_name=$1

    if [ ! -f "$FEATURE_FLAGS_FILE" ]; then
        log_error "Feature flags file not found. Run 'init' first."
        exit 1
    fi

    if command -v jq >/dev/null 2>&1; then
        if jq -e ".flags.\"$flag_name\"" "$FEATURE_FLAGS_FILE" > /dev/null 2>&1; then
            echo "=================================================================================="
            echo "Feature Flag Details: $flag_name"
            echo "=================================================================================="
            jq -r ".flags.\"$flag_name\" | \"Enabled: \(.enabled)\", \"Rollout: \(.rollout_percentage)%\", \"Description: \(.description)\", \"Created: \(.created_at)\", \"Updated: \(.updated_at)\"" "$FEATURE_FLAGS_FILE"
            echo "=================================================================================="
        else
            log_error "Feature flag '$flag_name' not found"
            exit 1
        fi
    else
        log_error "jq required for flag details. Please install jq."
        exit 1
    fi
}

# Main script logic
case "$1" in
    "init")
        init_feature_flags
        ;;
    "list")
        list_flags
        ;;
    "enable")
        if [ -z "$2" ]; then
            log_error "Feature flag name required"
            echo "Usage: $0 enable <flag-name> [rollout-percentage]"
            exit 1
        fi
        enable_flag "$2" "$3"
        ;;
    "disable")
        if [ -z "$2" ]; then
            log_error "Feature flag name required"
            echo "Usage: $0 disable <flag-name>"
            exit 1
        fi
        disable_flag "$2"
        ;;
    "rollout")
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Feature flag name and percentage required"
            echo "Usage: $0 rollout <flag-name> <percentage>"
            exit 1
        fi
        update_rollout "$2" "$3"
        ;;
    "add")
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Feature flag name and description required"
            echo "Usage: $0 add <flag-name> <description>"
            exit 1
        fi
        add_flag "$2" "$3"
        ;;
    "remove")
        if [ -z "$2" ]; then
            log_error "Feature flag name required"
            echo "Usage: $0 remove <flag-name>"
            exit 1
        fi
        remove_flag "$2"
        ;;
    "show")
        if [ -z "$2" ]; then
            log_error "Feature flag name required"
            echo "Usage: $0 show <flag-name>"
            exit 1
        fi
        show_flag "$2"
        ;;
    "backup")
        backup_flags
        ;;
    "restore")
        restore_flags
        ;;
    "validate")
        validate_flags
        ;;
    *)
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init                    Initialize feature flags configuration"
        echo "  list                    List all feature flags"
        echo "  enable <flag> [pct]     Enable a feature flag (optional rollout %)"
        echo "  disable <flag>          Disable a feature flag"
        echo "  rollout <flag> <pct>    Update rollout percentage for a flag"
        echo "  add <flag> <desc>       Add a new feature flag"
        echo "  remove <flag>           Remove a feature flag"
        echo "  show <flag>             Show detailed information about a flag"
        echo "  backup                  Backup current feature flags"
        echo "  restore                 Restore feature flags from backup"
        echo "  validate                Validate feature flags configuration"
        echo ""
        echo "Examples:"
        echo "  $0 init"
        echo "  $0 list"
        echo "  $0 enable recommendation_engine_v2 25"
        echo "  $0 rollout bulk_operations 75"
        echo "  $0 add new_feature \"New awesome feature\""
        exit 1
        ;;
esac