# 部署说明

## GitHub Pages

本仓库使用 GitHub Actions 构建并发布 `public/` 到 GitHub Pages。

需要在仓库设置中启用：

- Pages 使用 `GitHub Actions`
- Actions 具备读写 Pages 的权限

## 构建步骤

```bash
python3 scripts/build_site.py
python3 scripts/generate_jsonld.py
python3 scripts/build_vectors.py
```

## 发布结果

- 首页：`/`
- 深度笔记列表：`/books/`
- 知识卡片列表：`/cards/`
- API：`/api/books.json`

## Quartz 迁移

当前环境先使用 Python 静态构建器完成 MVP。后续具备 Node 环境后，可在 `quartz/` 目录接入 Quartz 渲染层，并沿用当前 `content/` 结构。
