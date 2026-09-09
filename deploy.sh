#!/usr/bin/env bash
set -euo pipefail

cd ~/Auyrveda
git fetch origin main
git checkout main
git pull --ff-only origin main

cd ~/Auyrveda/backend
npm install
npm run typecheck

cd ~/Auyrveda/frontend
npm install
npm run build

pm2 restart ayurveda-backend
pm2 restart ayurveda-frontend
pm2 save

echo "Deploy complete."
