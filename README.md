# uRead - 让每一次阅读，都留下可生长的沉淀

> 聚焦「读书笔记、精选书单、知识卡片」三大核心模块，打造轻量化、高适配、可资产化的深度阅读认知沉淀工具

## 🌟 项目愿景

uRead 致力于构建一个极简、智能的阅读认知沉淀平台，通过「阅读输入 - 结构化沉淀 - 原子化复用 - 体系化联动」的闭环流程，帮助用户将碎片化阅读转化为系统化知识资产。

## 🚀 快速开始

### 在线体验
🌐 [uRead Demo](https://your-username.github.io/uRead) - GitHub Pages 部署

### 本地开发
```bash
# 克隆项目
git clone https://github.com/your-org/uRead.git
cd uRead

# 安装依赖并启动
npm install
npm run dev
```

### 生产部署
```bash
# 构建生产版本
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 📱 主要功能

### 📝 读书笔记
- 📚 多格式文档导入（PDF, EPUB, Markdown）
- ✏️ 智能标注与高亮管理
- 🏷️ 标签分类与搜索
- 🔗 跨书籍关联

### 📚 精选书单
- 📖 个人书单管理
- 👥 协同编辑功能
- 📊 阅读进度跟踪
- 💡 AI 推荐系统

### 💡 知识卡片
- 🎯 原子化知识提取
- 🧩 智能卡片生成
- 🔄 自动关联网络
- 📤 多种导出格式

## 🛠️ 技术架构

### 前端 (GitHub Pages)
- **框架**: React + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router DOM
- **图标**: Lucide React

### 后端服务 (可选)
- **语言**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: SQLite (本地存储)
- **API**: RESTful 接口

### 部署策略
- ✅ **GitHub Pages**: 静态前端托管
- ✅ **Vercel/Netlify**: 全栈应用部署
- ✅ **Docker**: 容器化部署
- ✅ **自托管**: 完全离线使用

## 📋 项目结构

```
uRead/
├── public/                 # 静态资源
│   ├── index.html         # 主页面
│   └── assets/           # 图片等素材
├── src/
│   ├── components/       # React 组件
│   ├── views/           # 页面组件
│   ├── stores/          # 状态管理
│   ├── services/        # API 服务
│   ├── utils/          # 工具函数
│   └── types/          # TypeScript 类型
├── docs/               # 文档
├── .github/            # GitHub 配置
│   └── workflows/      # CI/CD 工作流
├── package.json        # 依赖管理
├── vite.config.ts     # Vite 配置
└── tailwind.config.js # Tailwind 配置
```

## 🤝 贡献指南

1. Fork 项目到你的 GitHub 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE)

## 🙏 致谢

感谢所有为 uRead 做出贡献的开发者！

## 🔗 相关项目

- [uWise 知识百科](https://github.com/your-org/uWise)
- [uSkill 能力工厂](https://github.com/your-org/uSkill)# uRead Deployment Update
