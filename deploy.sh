#!/usr/bin/env bash
# 本地构建并触发官方 Pages 部署流程。
#
# Stage 3 修复：原脚本使用 `git push -f` 强推 gh-pages 分支，
# 与 GitHub Actions 的 actions/deploy-pages 冲突且不可审计。
# 现在统一走官方 Pages 流程，不再强推任何分支。

set -euo pipefail

echo "🚀 uRead 构建开始..."

echo "📦 安装依赖（使用 lockfile）"
npm ci

echo "🔍 类型检查"
npm run typecheck

echo "🧪 单元测试"
npm test

echo "🔨 构建"
npm run build

echo "🚀 触发 GitHub Pages 部署"
if command -v gh >/dev/null 2>&1; then
  gh workflow run deploy.yml
  echo "✅ 已触发 deploy.yml，请到 Actions 查看结果"
else
  echo "ℹ️  未检测到 gh CLI：直接推送到 main 分支即可触发同一部署流程"
fi

echo "🌐 站点地址：https://zhubao315.github.io/uRead/"
