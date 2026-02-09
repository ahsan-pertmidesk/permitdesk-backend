#!/bin/sh
set -e

echo "📦 Running Prisma migrations..."
npm run prisma:migrate

echo "🚀 Starting server..."
npm start