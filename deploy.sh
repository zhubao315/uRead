#!/bin/bash

echo "🚀 Starting uRead deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy to GitHub Pages
echo "🚀 Deploying to GitHub Pages..."
git config --global user.email "zhubao315@users.noreply.github.com"
git config --global user.name "zhubao315"

# Add dist directory to git
git add -f dist/
git commit -m "Deploy to GitHub Pages $(date)"

# Push to gh-pages branch
git push -f origin main:gh-pages

echo "✅ Deployment completed!"
echo "🌐 Your uRead app is available at: https://zhubao315.github.io/uRead"