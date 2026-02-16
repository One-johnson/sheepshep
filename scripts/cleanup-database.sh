#!/bin/bash

# Database Cleanup Script
# 
# This script cleans all data from the Convex database except the first admin user.
# WARNING: This will delete ALL data! Use only in development!
# 
# Usage:
#   bash scripts/cleanup-database.sh
#   OR
#   chmod +x scripts/cleanup-database.sh && ./scripts/cleanup-database.sh

echo "⚠️  WARNING: This will delete ALL data from your Convex database!"
echo "⚠️  Only the first admin user will be kept."
echo ""
read -p "Type 'DELETE ALL DATA' to confirm: " confirm

if [ "$confirm" != "DELETE ALL DATA" ]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "💡 Tip: Copy the token value only (without quotes)"
read -p "Enter your admin auth token (from localStorage.getItem('authToken')): " token

if [ -z "$token" ]; then
    echo "❌ Token is required."
    exit 1
fi

# Strip quotes if user included them
token=$(echo "$token" | sed "s/^['\"]//; s/['\"]$//")

echo ""
echo "🔄 Cleaning database..."

# Use npx convex run to execute the mutation
npx convex run cleanup:cleanDatabase "{\"token\": \"$token\"}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database cleaned successfully!"
else
    echo ""
    echo "❌ Error cleaning database. Check your token and Convex connection."
    exit 1
fi
