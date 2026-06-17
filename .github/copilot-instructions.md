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

- 主色：`brand-500 #1a3a8f`（主）、`brand-700 #0d2b6b`（深）；占位灰 `placeholder #eef1f6`、卡片底 `surface`。
- 点缀色：`ember-500 #f97316`（安全橙，约 10% 用量：eyebrow/下划线/序号/数字/主 CTA/hover）；白底小号橙字用 `ember-700` 保证对比度。
- 字体：英文大标题用 `font-display`（Outfit），正文用 `font-sans`（Work Sans）；中文回退 Noto Sans SC。
- **禁止在标记中写死颜色十六进制值**，一律用 Tailwind token 类（如 `bg-brand-500`、`text-ember-700`）。
- 卡片统一用 `.card-base`，容器统一用 `.container-page`，小标题用 `.eyebrow`。

## 4. 组件规范

- 复用 `src/components/` 既有组件，**禁止**为单页重复造一次性卡片。
- 现有组件：`Hero`、`SectionHeader`、`IconFeatureCard`、`NumberedCard`、`ProductCard`、`ProcessStepper`、`PhotoPlaceholder`、`HighlightStat`、`WorldMapDots`、`WaveDivider`、`Icon`、`T`、`Header`、`Footer`。
- 组件命名 PascalCase；所有文案 props 使用 `LocalizedText`（`{ en, zh }`）类型。
- 新图标加到 `Icon.astro` 的 `paths` 表，line 风格、24×24、`stroke="currentColor"`。

## 5. 双语规则（语言切换，非中英并列）

- 所有可见文案来自 `src/content/*.json`，每条均为 `{ "en": "...", "zh": "..." }`。
- 渲染双语文本一律用 `T` 组件（`<T text={…} />`），或手写 `<span lang="en">…</span><span lang="zh">…</span>`；同一时间**只显示一种语言**，由 `html[data-lang]` + CSS 控制，禁止中英文同时并列。
- 首次访问按浏览器语言自动选择（中文环境→中文，否则英文），选择存 localStorage；Header 的语言切换按钮切换并持久化。
- 初始化与切换脚本在 `BaseLayout` （`<script is:inline>`），保持纯静态、无 FOUC、两种语言都在源码里（利于 SEO）。
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
