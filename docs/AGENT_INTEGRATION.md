# Agent Integration

uRead 当前为 Agent 暴露三类静态资产：

- `public/api/books.json`：书籍清单
- `public/api/tags.json`：标签索引
- `public/api/graph.json`：内容关系图
- `public/jsonld/*.json`：单篇内容结构化元数据
- `public/vectors/manifest.json`：待向量化分块清单

## 推荐接入方式

1. 拉取 `books.json` 作为入口目录
2. 用 `graph.json` 识别关联内容
3. 用 `manifest.json` 导入向量库，接入真实 Embedding 模型
4. 根据 `agentsPublic` 或 `isAccessibleForFree` 控制检索范围

## 后续扩展

- 增加 `authors.json`、`themes.json`
- 接入真实 ChromaDB 构建流程
- 提供 LangChain / LlamaIndex 示例
