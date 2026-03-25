# Quartz 迁移入口

当前仓库已经按 Quartz 友好的内容结构组织：

- `content/` 中的 Markdown 文件为唯一内容源
- 双向链接使用 `[[Wiki Link]]`
- 元数据集中在 frontmatter

由于当前本地环境缺少 `node` 和 `npm`，没有直接初始化 Quartz 运行时。后续建议步骤：

1. 在仓库根目录安装 Node 20+
2. 初始化 Quartz v4
3. 将 Quartz 的内容目录指向当前 `content/`
4. 保留现有 JSON API 和 JSON-LD 脚本，作为 Agent 扩展层

这样可以同时获得：

- Quartz 的阅读体验、知识图谱和搜索
- uRead 自定义的静态 API、元数据与变现扩展能力
