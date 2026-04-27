#!/bin/bash
echo "🧪 Testing receipt scanner..."
curl -s http://localhost:3000/api/scan-receipt -X POST -F "file=@public/images/logo.jpg" --max-time 30 | jq .
if [ $? -eq 0 ]; then 
  echo "✅ Receipt scanner working!"
else
  echo "❌ Still needs setup"
fi
