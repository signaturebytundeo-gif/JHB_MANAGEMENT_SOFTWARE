#!/bin/bash
echo "🔍 Checking API key setup..."
if grep -q "sk-ant-api03-.*[A-Za-z0-9]" .env.local; then
  echo "✅ API key detected!"
  echo "🧪 Testing receipt scanner..."
  curl -s http://localhost:3000/api/scan-receipt -X POST --max-time 5 | head -20
else
  echo "❌ API key still needs to be set in .env.local"
  echo "Current value:"
  grep "ANTHROPIC_API_KEY" .env.local
fi
