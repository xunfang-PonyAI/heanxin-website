# 禾安鑫官网 · Heanxin Website

东莞市禾安鑫五金塑胶制品有限公司（Dongguan Heanxin Hardware & Plastic Products Co., Ltd.）企业官网。

中英双语画册型静态站点，业务涵盖塑胶注塑、模具开发、嵌件注塑、五金塑胶组合件与 OEM / ODM 代工。

## 技术栈

- **Astro** + **Tailwind CSS v4** + **TypeScript**，纯静态。
- 部署：**GitHub Pages 项目页**，线上地址 `https://xunfang-ponyai.github.io/heanxin-website/`。
- 少量渐进增强 JS（语言切换、过渡、滚动动画、轮播），静态 HTML 对搜索引擎可见；SEO 配置包含页面 meta、结构化数据和 sitemap。

## 开发

```bash
npm install      # 安装依赖
npm run dev      # 本地开发 http://localhost:4321/heanxin-website
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
npm run format   # Prettier 格式化
```

## 目录结构

```text
src/
├─ components/   可复用组件（Hero、卡片、流程条、页眉页脚等）
├─ layouts/      BaseLayout（SEO / JSON-LD / 导航 / 页脚）
├─ content/      双语内容 *.json（{ en, zh }）
├─ styles/       global.css（设计 token 唯一来源）
└─ pages/        静态页面、新闻详情页 + 404
public/          静态资源（favicon、og-image）
.github/         Copilot 指令、提示词、Pages 部署工作流
```

## 修改内容

- **改文案**：只动 `src/content/*.json`，不动组件。
- **改配色/字体**：只动 `src/styles/global.css` 的 `@theme` token。
- **改公司信息**：只动 `src/content/site.json`。
- **替换图片**：将真实图片放入 `public/images/`（优先 WebP），替换 `PhotoPlaceholder`。

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages。
需在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
