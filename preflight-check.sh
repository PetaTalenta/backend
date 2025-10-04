#!/bin/bash

# Pre-flight check script for GitHub submodule migration

echo "========================================="
echo "Pre-flight Check"
echo "========================================="
echo ""

# Check 1: GitHub CLI installed
echo "✅ Check 1: GitHub CLI installed"
which gh &> /dev/null || { echo "❌ GitHub CLI not found"; exit 1; }
echo ""

# Check 2: GitHub CLI authenticated
echo "Check 2: GitHub CLI authentication"
if gh auth status &> /dev/null 2>&1; then
    echo "✅ GitHub CLI authenticated"
    gh auth status
else
    echo "❌ Not authenticated with GitHub CLI"
    echo ""
    echo "Please authenticate by running:"
    echo "  gh auth login"
    echo ""
    echo "Then choose:"
    echo "  - GitHub.com"
    echo "  - HTTPS (or SSH if you prefer)"
    echo "  - Yes (authenticate Git)"
    echo "  - Login with a web browser"
    echo ""
    exit 1
fi
echo ""

# Check 3: Git configured
echo "Check 3: Git configuration"
GIT_USER=$(git config --global user.name)
GIT_EMAIL=$(git config --global user.email)

if [ -z "$GIT_USER" ] || [ -z "$GIT_EMAIL" ]; then
    echo "⚠️  Git user not fully configured"
    echo "Current config:"
    echo "  Name: $GIT_USER"
    echo "  Email: $GIT_EMAIL"
    echo ""
    echo "Configure with:"
    echo "  git config --global user.name 'Your Name'"
    echo "  git config --global user.email 'your.email@example.com'"
else
    echo "✅ Git configured"
    echo "  Name: $GIT_USER"
    echo "  Email: $GIT_EMAIL"
fi
echo ""

# Check 4: Verify organization access
echo "Check 4: Organization access"
if gh api orgs/PetaTalenta &> /dev/null; then
    echo "✅ Can access PetaTalenta organization"
else
    echo "⚠️  Cannot access PetaTalenta organization"
    echo "Make sure you have the necessary permissions"
fi
echo ""

# Check 5: Verify current directory
echo "Check 5: Current directory"
CURRENT_DIR=$(pwd)
if [[ "$CURRENT_DIR" == *"atma-backend" ]]; then
    echo "✅ In atma-backend directory"
    echo "  Path: $CURRENT_DIR"
else
    echo "⚠️  Not in atma-backend directory"
    echo "  Current: $CURRENT_DIR"
    echo "  Expected: /home/rayin/Desktop/atma-backend"
fi
echo ""

# Check 6: Verify services exist
echo "Check 6: Service directories"
SERVICES=("api-gateway" "admin-service" "analysis-worker" "documentation-service" "chatbot-service" "notification-service")
ALL_EXIST=true

for SERVICE in "${SERVICES[@]}"; do
    if [ -d "$SERVICE" ]; then
        echo "  ✅ $SERVICE"
    else
        echo "  ❌ $SERVICE (not found)"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo "✅ All service directories found"
else
    echo "⚠️  Some service directories are missing"
fi
echo ""

# Check 7: Check for uncommitted changes
echo "Check 7: Git status"
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  You have uncommitted changes"
    echo "Consider committing or stashing them before migration"
    echo ""
    git status --short
fi
echo ""

echo "========================================="
echo "Pre-flight Check Complete"
echo "========================================="
echo ""

if gh auth status &> /dev/null 2>&1 && [ "$ALL_EXIST" = true ]; then
    echo "✅ Ready to run migration!"
    echo ""
    echo "Run the migration script:"
    echo "  ./migrate-to-submodules.sh"
else
    echo "⚠️  Please fix the issues above before running migration"
fi
