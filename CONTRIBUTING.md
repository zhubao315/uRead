# 贡献指南

感谢你为 uRead 项目做出贡献！我们欢迎所有形式的贡献，包括新功能、bug修复、文档改进等。

## 如何贡献

### 1. Fork 项目
首先，将 uRead 项目 fork 到你自己的 GitHub 账户下。

### 2. 创建特性分支
```bash
git checkout -b feature/amazing-feature
```

### 3. 提交更改
确保你的代码遵循项目的编码规范：

- 使用 TypeScript 编写代码
- 遵循 ESLint 配置
- 添加适当的注释和文档
- 编写测试（如果适用）

### 4. 运行代码检查
在提交之前，确保通过所有检查：
```bash
npm run lint
npm run format
```

### 5. 测试你的更改
运行构建命令确保一切正常：
```bash
npm run build
```

### 6. 提交更改
```bash
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

### 7. 创建 Pull Request
在你的 GitHub 仓库页面创建 Pull Request，详细描述你做的更改。

## 开发环境设置

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 代码风格

- 使用 Prettier 格式化代码
- 遵循 ESLint 规则
- 保持一致的命名约定
- 添加必要的类型注解

## 提交信息格式

请使用清晰的提交信息，遵循以下格式：
```
type(scope): description

body (可选)

footer (可选)
```

类型包括：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 报告问题

如果你发现 bug 或有功能建议，请在 GitHub Issues 中创建新 issue。

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。