#!/bin/bash

# Hyperscalper System Monitor
# Quick script to check system health

echo "================================"
echo "HYPERSCALPER SYSTEM MONITOR"
echo "================================"
echo ""

# PM2 Status
echo "📊 PM2 PROCESSES:"
echo "---"
pm2 list | grep -E "hyperscalper|boitoan|popytrade|vibe"
echo ""

# Memory Usage
echo "💾 MEMORY USAGE:"
echo "---"
free -h | head -2
echo ""

# Disk Usage
echo "💿 DISK USAGE:"
echo "---"
df -h / | tail -1
echo ""

# CPU Load
echo "⚡ CPU LOAD:"
echo "---"
uptime
echo ""

# Recent Errors (if any)
echo "🔍 RECENT ERRORS (last 10 lines):"
echo "---"
pm2 logs hyperscalper-frontend --nostream --lines 10 --err 2>/dev/null | tail -10 || echo "No recent errors"
echo ""

# Port Status
echo "🌐 PORT STATUS:"
echo "---"
echo "Port 6688 (dashboard): $(lsof -i :6688 2>/dev/null | grep LISTEN | wc -l) listener(s)"
echo "Port 3001 (frontend): $(lsof -i :3001 2>/dev/null | grep LISTEN | wc -l) listener(s)"
echo ""

# Process Restart Counts
echo "🔄 RESTART COUNTS:"
echo "---"
pm2 list | grep hyperscalper | awk '{print $2": "$4" restarts"}'
echo ""

# Network Connections
echo "🔗 ACTIVE CONNECTIONS:"
echo "---"
netstat -an | grep ESTABLISHED | grep -E "6688|3001" | wc -l
echo "active connections to hyperscalper services"
echo ""

echo "================================"
echo "Status: ✅ Monitoring Complete"
echo "================================"
