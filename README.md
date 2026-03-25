# uRead

uRead 是一个基于 GitHub 维护、面向深度阅读者与知识创作者的开源读书笔记项目。它以“内容即代码”为核心，强调结构化沉淀、公开协作、Agent 友好和可持续变现。

当前仓库先落地一个可直接发布到 GitHub Pages 的 MVP：

- `content/` 存放内容资产与模板
- `scripts/` 生成静态页面、JSON API、JSON-LD 元数据和向量索引占位数据
- `public/` 为构建产物目录，由 GitHub Actions 自动发布
- `docs/` 存放贡献、部署和 Agent 集成文档
- `quartz/` 保留 Quartz 迁移说明与配置入口

## MVP 范围

- 标准化深度读书笔记模板
- 3 本经典书籍示例笔记
- 静态首页、书籍列表页、笔记详情页
- `/api/books.json`、`/api/tags.json`、`/api/graph.json`
- 每篇笔记对应的 JSON-LD 文件
- GitHub Pages 自动部署工作流

## 本地构建

本项目当前使用 Python 构建 MVP 站点，无需 Node 环境：

```bash
python3 scripts/build_site.py
python3 scripts/generate_jsonld.py
python3 scripts/build_vectors.py
```

构建完成后，产物位于 `public/`。

## GitHub 配置

- 仓库地址：`https://github.com/zhubao315/uRead`
- Pages 地址：`https://zhubao315.github.io/uRead`

建议仓库 Settings 中启用：

- `Pages > Build and deployment > GitHub Actions`
- `Actions > General > Read and write permissions`

## 后续建议

当前环境没有 `node` 和 `npm`，因此没有直接初始化 Quartz 运行时。内容结构和部署流程已经按 Quartz 迁移思路整理，后续在具备 Node 环境后可接入 Quartz 渲染层。
