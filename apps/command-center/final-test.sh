#!/bin/bash
echo "🧪 Testing receipt scanner..."
result=$(curl -s http://localhost:3000/api/scan-receipt -X POST -F "file=@public/images/logo.jpg" --max-time 30)
if echo "$result" | grep -q "receiptUrl\|extracted"; then
  echo "✅ SUCCESS! Receipt scanner working!"
  echo "$result" | jq .
else
  echo "❌ Still needs setup:"
  echo "$result"
fi
