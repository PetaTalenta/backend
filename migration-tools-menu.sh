#!/bin/bash

# Interactive menu for migration and Docker management tools

SCRIPT_DIR="/home/rayin/Desktop/atma-backend"

show_banner() {
    clear
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════╗
║          ATMA BACKEND - MIGRATION & DOCKER MANAGEMENT TOOLS          ║
║                    GitHub Organization: PetaTalenta                  ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
    echo ""
}

show_menu() {
    echo "Available Tools:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  MIGRATION TOOLS"
    echo "  1. Run Pre-flight Check (preflight-check.sh)"
    echo "  2. Run Full Migration (migrate-to-submodules.sh)"
    echo ""
    echo "  DOCKER MANAGEMENT"
    echo "  3. Fix ECONNREFUSED Errors (fix-docker-econnrefused.sh)"
    echo "  4. View Docker Status (docker-compose ps)"
    echo "  5. Restart All Services (docker-compose restart)"
    echo "  6. View Service Logs (interactive)"
    echo ""
    echo "  DOCUMENTATION"
    echo "  7. View Quick Reference"
    echo "  8. View Migration Summary"
    echo "  9. View Checklist"
    echo ""
    echo "  OTHER"
    echo "  10. List GitHub Repositories"
    echo "  11. Check Submodule Status"
    echo "  0. Exit"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

run_preflight() {
    echo ""
    echo "Running Pre-flight Check..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    bash "$SCRIPT_DIR/preflight-check.sh"
    echo ""
    read -p "Press Enter to continue..."
}

run_migration() {
    echo ""
    echo "⚠️  WARNING: This will modify your repository structure!"
    echo "A backup will be created automatically."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo ""
        echo "Running Migration Script..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        bash "$SCRIPT_DIR/migrate-to-submodules.sh"
    else
        echo "Migration cancelled."
    fi
    echo ""
    read -p "Press Enter to continue..."
}

fix_docker_errors() {
    echo ""
    echo "Running Docker ECONNREFUSED Fix..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    bash "$SCRIPT_DIR/fix-docker-econnrefused.sh"
    echo ""
    read -p "Press Enter to continue..."
}

show_docker_status() {
    echo ""
    echo "Docker Services Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$SCRIPT_DIR"
    docker-compose ps
    echo ""
    echo "All Running Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    read -p "Press Enter to continue..."
}

restart_all_services() {
    echo ""
    echo "Restarting All Docker Services..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$SCRIPT_DIR"
    docker-compose restart
    echo ""
    echo "✅ All services restarted"
    echo ""
    docker-compose ps
    echo ""
    read -p "Press Enter to continue..."
}

view_service_logs() {
    echo ""
    echo "Select Service to View Logs:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  1. api-gateway"
    echo "  2. admin-service"
    echo "  3. analysis-worker"
    echo "  4. documentation-service"
    echo "  5. chatbot-service"
    echo "  6. notification-service"
    echo "  7. All services"
    echo "  0. Back to main menu"
    echo ""
    read -p "Enter choice: " log_choice
    
    cd "$SCRIPT_DIR"
    case $log_choice in
        1) docker-compose logs -f api-gateway ;;
        2) docker-compose logs -f admin-service ;;
        3) docker-compose logs -f analysis-worker ;;
        4) docker-compose logs -f documentation-service ;;
        5) docker-compose logs -f chatbot-service ;;
        6) docker-compose logs -f notification-service ;;
        7) docker-compose logs -f ;;
        0) return ;;
        *) echo "Invalid choice" ;;
    esac
}

view_quick_reference() {
    echo ""
    cat "$SCRIPT_DIR/QUICK_REFERENCE.txt"
    echo ""
    read -p "Press Enter to continue..."
}

view_summary() {
    echo ""
    echo "Opening Migration Summary..."
    if command -v less &> /dev/null; then
        less "$SCRIPT_DIR/MIGRATION_SUMMARY.md"
    else
        cat "$SCRIPT_DIR/MIGRATION_SUMMARY.md"
        read -p "Press Enter to continue..."
    fi
}

view_checklist() {
    echo ""
    cat "$SCRIPT_DIR/MIGRATION_CHECKLIST.txt"
    echo ""
    read -p "Press Enter to continue..."
}

list_repos() {
    echo ""
    echo "GitHub Repositories in PetaTalenta Organization"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    gh repo list PetaTalenta --limit 20
    echo ""
    read -p "Press Enter to continue..."
}

check_submodules() {
    echo ""
    echo "Git Submodule Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$SCRIPT_DIR"
    git submodule status
    echo ""
    echo ".gitmodules content:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat .gitmodules 2>/dev/null || echo "No .gitmodules file found (migration not yet run)"
    echo ""
    read -p "Press Enter to continue..."
}

# Main loop
while true; do
    show_banner
    show_menu
    read -p "Enter your choice: " choice
    
    case $choice in
        1) run_preflight ;;
        2) run_migration ;;
        3) fix_docker_errors ;;
        4) show_docker_status ;;
        5) restart_all_services ;;
        6) view_service_logs ;;
        7) view_quick_reference ;;
        8) view_summary ;;
        9) view_checklist ;;
        10) list_repos ;;
        11) check_submodules ;;
        0) 
            echo ""
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo ""
            echo "Invalid choice. Please try again."
            sleep 2
            ;;
    esac
done
