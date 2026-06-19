#!/bin/bash

# Script to deploy Firestore rules
# Make sure you're logged in: firebase login

echo "Building Cloud Functions..."
(cd functions && npm run build)

echo "Deploying Firestore rules, indexes, and inventory delete function..."
firebase deploy --only firestore:rules,firestore:indexes,functions:deleteCatalogItemAdmin

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules, indexes, and delete function deployed successfully!"
    echo "Inventory delete, requests, attendance, and shifts should work after indexes finish building (1-2 minutes)."
else
    echo "❌ Deployment failed."
    echo "Please deploy manually via Firebase Console:"
    echo "1. Go to https://console.firebase.google.com/"
    echo "2. Select your project: loopify-5e958"
    echo "3. Navigate to Firestore Database > Rules"
    echo "4. Copy contents of firestore.rules and paste"
    echo "5. Click Publish"
fi












