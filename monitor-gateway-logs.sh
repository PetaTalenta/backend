#!/bin/bash

# ATMA API Gateway Log Monitor
# Usage: ./monitor-gateway-logs.sh

echo "🔍 ATMA API Gateway Log Monitor"
echo "================================"
echo "📁 Log file: api-gateway/logs/gateway-$(date +%Y-%m-%d).log"
echo "⏰ Started at: $(date)"
echo "🔄 Press Ctrl+C to stop"
echo ""

# Check if log file exists
LOG_FILE="api-gateway/logs/gateway-$(date +%Y-%m-%d).log"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    echo "💡 Make sure API Gateway is running and has created today's log file"
    exit 1
fi

# Monitor logs with colored output
tail -f "$LOG_FILE" | while read line; do
    # Parse JSON and format output
    timestamp=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
    level=$(echo "$line" | jq -r '.level // empty' 2>/dev/null)
    message=$(echo "$line" | jq -r '.message // empty' 2>/dev/null)
    
    if [ "$level" = "info" ] && [ "$message" != "null" ]; then
        # Extract request info
        type=$(echo "$line" | jq -r '.message.type // empty' 2>/dev/null)
        method=$(echo "$line" | jq -r '.message.method // empty' 2>/dev/null)
        url=$(echo "$line" | jq -r '.message.url // empty' 2>/dev/null)
        statusCode=$(echo "$line" | jq -r '.message.statusCode // empty' 2>/dev/null)
        duration=$(echo "$line" | jq -r '.message.duration // empty' 2>/dev/null)
        service=$(echo "$line" | jq -r '.message.service // empty' 2>/dev/null)
        userAgent=$(echo "$line" | jq -r '.message.userAgent // empty' 2>/dev/null)
        
        # Format timestamp
        if [ "$timestamp" != "null" ] && [ "$timestamp" != "" ]; then
            formatted_time=$(date -d "$timestamp" "+%H:%M:%S" 2>/dev/null || echo "$timestamp")
        else
            formatted_time=$(date "+%H:%M:%S")
        fi
        
        # Color codes
        GREEN='\033[0;32m'
        BLUE='\033[0;34m'
        YELLOW='\033[1;33m'
        RED='\033[0;31m'
        NC='\033[0m' # No Color
        
        # Format output based on type
        case "$type" in
            "request")
                if [ "$statusCode" = "200" ]; then
                    color=$GREEN
                elif [ "$statusCode" = "404" ]; then
                    color=$YELLOW
                else
                    color=$RED
                fi
                echo -e "${color}[$formatted_time] REQUEST: $method $url → $statusCode (${duration}ms)${NC}"
                if [ "$userAgent" != "null" ] && [ "$userAgent" != "" ] && [[ ! "$userAgent" =~ "curl" ]]; then
                    echo -e "  👤 User-Agent: $userAgent"
                fi
                ;;
            "proxy_request")
                echo -e "${BLUE}[$formatted_time] PROXY → $method $url to $service${NC}"
                ;;
            "proxy_response")
                if [ "$statusCode" = "200" ]; then
                    color=$GREEN
                else
                    color=$RED
                fi
                echo -e "${color}[$formatted_time] PROXY ← $statusCode (${duration}ms)${NC}"
                ;;
            "proxy_error")
                echo -e "${RED}[$formatted_time] PROXY ERROR: $method $url - $(echo "$line" | jq -r '.message.error // empty')${NC}"
                ;;
            *)
                echo -e "[$formatted_time] $line"
                ;;
        esac
    else
        echo -e "[$formatted_time] $line"
    fi
done
