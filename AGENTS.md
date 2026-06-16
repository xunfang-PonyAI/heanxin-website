# AGENTS.md

跨 AI 工具（Copilot / Cursor / Claude Code 等）通用的项目规则。**单一事实源**，与 `.github/copilot-instructions.md` 保持一致。

## 项目

东莞市禾安鑫五金塑胶制品有限公司企业官网：7 页中英双语画册型静态站，业务为塑胶注塑、模具开发、五金塑胶组合件、OEM / ODM。

## 技术栈

- Astro + Tailwind CSS v4 + TypeScript，纯静态。
- 部署：GitHub Pages 项目页，`base = /heanxin-website`。

## 命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建到 dist/
npm run preview  # 预览构建产物
npm run format   # Prettier 格式化
```

## 硬性约束

- 内部链接/资源一律用 `url()`（`src/lib/i18n.ts`），禁止裸绝对路径。
- 颜色只用 `src/styles/global.css` `@theme` 中的 token：主色深蓝 `brand-*`，点缀安全橙 `ember-*`（约 10% 用量），禁止硬编码十六进制。
- 字体：标题 Outfit（`font-display`），正文 Work Sans（`font-sans`），中文 Noto Sans SC。
- 文案进 `src/content/*.json`，结构 `{ en, zh }`；用 `T` 组件或 `lang` 属性 span 渲染，**语言切换、同时只显示一种**（由 `html[data-lang]` 控制），禁止中英并列。
- 复用 `src/components/` 既有组件，禁止为单页重复造卡片。
- 禁止后端/SSR/重型 UI 库；保持轻量、低依赖。
- 图片用 `PhotoPlaceholder` 占位并提供双语 `alt`。

## 目录

- `src/components/` 可复用组件
- `src/layouts/BaseLayout.astro` 页面骨架（SEO / JSON-LD / 导航 / 页脚）
- `src/content/*.json` 双语内容
- `src/styles/global.css` 设计 token（唯一来源）
- `src/pages/` 路由页面
