# 禾安鑫官网 — GitHub Copilot 指令

本仓库是 **东莞市禾安鑫五金塑胶制品有限公司** 的企业官网。生成代码时请严格遵守以下约定。

## 1. 项目概述

- 7 页**企业画册转网站**（营销/展示型，几乎零交互），全站**中英双语**。
- 业务：塑胶注塑、模具开发、嵌件注塑、五金塑胶组合件、OEM / ODM 代工。
- 目标受众：寻找代工的国内外 OEM / ODM 买家 → **SEO 是真实业务目标**。

## 2. 技术栈与约束（不可违背）

- **Astro + Tailwind CSS v4 + TypeScript**，纯静态站点。
- 部署在 **GitHub Pages 项目页**：`base` 必须为 `/heanxin-website`。
- 内部链接与静态资源 **一律使用 `url()` 助手**（`src/lib/i18n.ts`），禁止写死以 `/` 开头的绝对路径，否则会因 base path 404。
- **禁止**引入后端 / SSR / API 路由 / 数据库；优先轻量、低依赖方案。
- **禁止**引入重型 UI 库（Ant Design、MUI 等）。

## 3. 设计 Token（唯一来源 = `src/styles/global.css`）

- 主色：`brand-500 #1a3a8f`（主）、`brand-700 #0d2b6b`（深）；占位灰 `placeholder #eef1f6`。
- 字体：英文大标题用 `font-display`（Oswald），正文用 `font-sans`（Inter）；中文回退 Noto Sans SC。
- **禁止在标记中写死颜色十六进制值**，一律用 Tailwind token 类（如 `bg-brand-500`、`text-brand-700`）。
- 卡片统一用 `.card-base`，容器统一用 `.container-page`，小标题用 `.eyebrow`。

## 4. 组件规范

- 复用 `src/components/` 既有组件，**禁止**为单页重复造一次性卡片。
- 现有组件：`Hero`、`SectionHeader`、`IconFeatureCard`、`NumberedCard`、`ProductCard`、`ProcessStepper`、`PhotoPlaceholder`、`HighlightStat`、`WorldMapDots`、`WaveDivider`、`Icon`、`Header`、`Footer`。
- 组件命名 PascalCase；所有文案 props 使用 `LocalizedText`（`{ en, zh }`）类型。
- 新图标加到 `Icon.astro` 的 `paths` 表，line 风格、24×24、`stroke="currentColor"`。

## 5. 双语规则

- 所有可见文案来自 `src/content/*.json`，每条均为 `{ "en": "...", "zh": "..." }`。
- 组件需**同时渲染中英文**（英文为主、中文为辅或并列），不要写死两套 DOM。
- 改文案只动 JSON，不动组件。

## 6. 可访问性（A11y）

- 每个图片/占位必须有描述性替代文本（`PhotoPlaceholder` 的 `alt` 为 `LocalizedText`）。
- 深蓝底上的文字保证对比度 ≥ 4.5:1（用 `text-white` / `text-brand-100`）。
- 使用语义化标签与 landmark；保留 `Skip to content` 跳转链接。

## 7. SEO

- 每个页面通过 `BaseLayout` 传入独立的 `title` 与 `description`（中文，含关键词）。
- 站点级结构化数据（Organization / 地址 / 电话 / 邮箱）已在 `BaseLayout` 注入，改公司信息只动 `src/content/site.json`。
- 由 `@astrojs/sitemap` 自动生成 sitemap。

## 8. 性能 / 静态

- 默认零运行时 JS；移动端菜单用纯 CSS（`<details>`），不要引入 JS 框架。
- 真实图片替换占位时，放入 `public/images/` 并优先使用 WebP、加 `loading="lazy"`。

## 9. Do / Don't

- ✅ 用 token 与既有组件、用 `url()` 处理路径、文案进 JSON、保持中英双语。
- ❌ 写死颜色、写死绝对路径、引入后端 / 重型 UI 库、为单页重复造组件。
