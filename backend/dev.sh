#!/bin/bash

echo "Starting MongoDB..."
mongod --dbpath "$HOME/mongodb-data" > /tmp/ayurveda-mongo.log 2>&1 &

sleep 2

echo "Starting backend..."
npm run dev