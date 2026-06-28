import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readText(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertLocalized(value, label) {
  assert(value && typeof value === "object", `${label} must be a localized object`);
  assert(typeof value.en === "string" && value.en.trim(), `${label}.en is required`);
  assert(typeof value.zh === "string" && value.zh.trim(), `${label}.zh is required`);
}

function assertLocalizedStringArray(value, label) {
  assert(value && typeof value === "object", `${label} must be a localized object`);
  assert(Array.isArray(value.en), `${label}.en must be an array`);
  assert(Array.isArray(value.zh), `${label}.zh must be an array`);
  assert(
    value.en.every((item) => typeof item === "string" && item.trim()),
    `${label}.en terms`
  );
  assert(
    value.zh.every((item) => typeof item === "string" && item.trim()),
    `${label}.zh terms`
  );
}

function assertContains(text, expected, label) {
  assert(text.includes(expected), `${label} must contain "${expected}"`);
}

function assertNotContains(text, unexpected, label) {
  assert(!text.includes(unexpected), `${label} must not contain "${unexpected}"`);
}

function listSourceFiles(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  const entries = readdirSync(absoluteDir);
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(root, relativePath);
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(relativePath));
    } else if (/\.(astro|css|ts)$/.test(entry)) {
      files.push(relativePath.replaceAll("\\", "/"));
    }
  }
  return files;
}

function assertQuotePath() {
  const site = readJson("src/content/site.json");
  const home = readJson("src/content/home.json");
  const quote = readJson("src/content/quote.json");
  const contact = readJson("src/content/contact.json");
  const header = readText("src/components/Header.astro");
  const contactPage = readText("src/pages/contact.astro");

  assert(
    site.quoteCta?.href === "/contact#quote",
    "site.quoteCta.href must point to /contact#quote"
  );
  assertLocalized(site.quoteCta.label, "site.quoteCta.label");
  assert(site.quoteCta.label.en === "Get a Quote", "site quote CTA English label must be exact");
  assert(site.quoteCta.label.zh === "获取报价", "site quote CTA Chinese label must be exact");

  assert(home.hero.primaryCta.en === "Get a Quote", "home hero primary CTA should request a quote");
  assert(home.hero.primaryCta.zh === "获取报价", "home hero primary CTA should request a quote");
  assert(
    home.hero.secondaryCta.en === "View Products",
    "home hero secondary CTA should show products"
  );
  assert(home.hero.secondaryCta.zh === "查看产品", "home hero secondary CTA should show products");

  assertContains(header, "quoteCta", "Header");
  assertContains(contactPage, "QuoteSection", "Contact page");
  assertContains(contactPage, "contact.json", "Contact page");
  assertLocalized(contact.header.title, "contact.header.title");
  assert(Array.isArray(contact.highlights) && contact.highlights.length >= 3, "contact.highlights");

  assert(quote.sectionId === "quote", "quote section must expose #quote anchor");
  assertLocalized(quote.header.title, "quote.header.title");
  assert(Array.isArray(quote.fields), "quote.fields must be an array");

  const requiredFieldIds = [
    "name",
    "company",
    "email",
    "phone",
    "productType",
    "material",
    "quantity",
    "drawingStatus",
    "message",
    "files",
  ];
  for (const fieldId of requiredFieldIds) {
    const field = quote.fields.find((item) => item.id === fieldId);
    assert(field, `quote.fields must include ${fieldId}`);
    assertLocalized(field.label, `quote.fields.${fieldId}.label`);
  }
}

function assertNavigationArchitecture() {
  const site = readJson("src/content/site.json");
  const header = readText("src/components/Header.astro");

  const expected = [
    ["/", "Home", "首页"],
    ["/about", "About Us", "关于我们"],
    ["/products", "Products", "产品分类"],
    ["/capabilities", "Capabilities", "制造能力"],
    ["/materials-processes", "Materials & Processes", "材料工艺"],
    ["/industries", "Industries", "应用行业"],
    ["/news", "News", "新闻资讯"],
    ["/contact", "Contact Us", "联系我们"],
  ];

  assert(site.nav.length === expected.length, "site.nav should expose exactly eight primary items");
  expected.forEach(([href, en, zh], index) => {
    const item = site.nav[index];
    assert(item?.href === href, `site.nav[${index}].href must be ${href}`);
    assert(item.label.en === en, `site.nav[${index}].label.en must be ${en}`);
    assert(item.label.zh === zh, `site.nav[${index}].label.zh must be ${zh}`);
  });

  assertContains(header, "xl:flex", "Header desktop navigation breakpoint");
  assertContains(header, "quoteCta", "Header quote CTA");
}

function assertCapabilitiesPage() {
  const site = readJson("src/content/site.json");
  const capabilities = readJson("src/content/capabilities.json");
  const page = readText("src/pages/capabilities.astro");
  const component = readText("src/components/CapabilitiesPage.astro");

  const navItem = site.nav.find((item) => item.href === "/capabilities");
  assert(navItem, "site.nav must include /capabilities");
  assert(navItem.label.en === "Capabilities", "capabilities nav English label is required");
  assert(navItem.label.zh === "制造能力", "capabilities nav Chinese label is required");

  assertLocalized(capabilities.hero.title, "capabilities.hero.title");
  assert(
    Array.isArray(capabilities.services) && capabilities.services.length === 6,
    "capabilities.services must include six core manufacturing capabilities"
  );
  assert(
    Array.isArray(capabilities.projectFlow.steps) && capabilities.projectFlow.steps.length === 6,
    "capabilities project flow must include six steps"
  );
  assert(
    Array.isArray(capabilities.moldFlow.steps) && capabilities.moldFlow.steps.length === 6,
    "capabilities mold flow must include six steps"
  );
  assert(
    Array.isArray(capabilities.gallery) && capabilities.gallery.length >= 4,
    "capabilities gallery must include workshop image slots"
  );
  assertContains(page, "CapabilitiesPage", "Capabilities page");
  assertContains(component, "capabilities.json", "Capabilities component");
  assertContains(component, "ProcessStepper", "Capabilities component");
  assertContains(component, "/contact#quote", "Capabilities component quote link");
}

function assertMaterialsProcessesPage() {
  const site = readJson("src/content/site.json");
  const materials = readJson("src/content/materials-processes.json");
  const page = readText("src/pages/materials-processes.astro");
  const header = readText("src/components/Header.astro");

  const navItem = site.nav.find((item) => item.href === "/materials-processes");
  assert(navItem, "site.nav must include /materials-processes");
  assert(navItem.label.en === "Materials & Processes", "materials nav English label is required");
  assert(navItem.label.zh === "材料工艺", "materials nav Chinese label is required");

  assertContains(header, "xl:flex", "Header desktop navigation breakpoint");
  assertContains(header, "xl:hidden", "Header mobile navigation breakpoint");
  assertContains(page, "materials-processes.json", "Materials page");
  assertContains(page, "SectionHeader", "Materials page");
  assertContains(page, "/contact#quote", "Materials page quote link");

  const requiredMaterials = [
    "ABS",
    "PC",
    "PC+ABS",
    "PP",
    "PE",
    "PA / Nylon",
    "POM",
    "PMMA",
    "Flame-retardant Materials",
    "Transparent Materials",
  ];
  const materialNames = materials.materials.map((item) => item.title.en);
  for (const material of requiredMaterials) {
    assert(materialNames.includes(material), `materials list must include ${material}`);
  }

  const requiredProcesses = [
    "Spray Painting",
    "Screen Printing",
    "Pad Printing",
    "Laser Engraving",
    "Electroplating",
    "Assembly",
  ];
  const processNames = materials.processes.map((item) => item.title.en);
  for (const process of requiredProcesses) {
    assert(processNames.includes(process), `process list must include ${process}`);
  }
}

function assertNewsSeoPages() {
  const site = readJson("src/content/site.json");
  const news = readJson("src/content/news.json");
  const listPage = readText("src/pages/news.astro");
  const detailPage = readText("src/pages/news/[slug].astro");
  const searchComponent = readText("src/components/NewsSearch.astro");

  const navItem = site.nav.find((item) => item.href === "/news");
  assert(navItem, "site.nav must include /news");
  assert(navItem.label.en === "News", "news nav English label is required");
  assert(navItem.label.zh === "新闻资讯", "news nav Chinese label is required");

  assertLocalized(news.header.title, "news.header.title");
  assert(Array.isArray(news.articles), "news.articles must be an array");
  assert(news.articles.length >= 5, "news must include at least five SEO article topics");

  const requiredSlugs = [
    "choose-right-material-plastic-enclosures",
    "abs-vs-pc-electronic-housings",
    "what-is-plastic-injection-molding",
    "start-custom-plastic-product-project",
    "plastic-mold-development-process",
  ];
  const slugs = news.articles.map((article) => article.slug);
  for (const slug of requiredSlugs) {
    assert(slugs.includes(slug), `news.articles must include ${slug}`);
  }

  for (const article of news.articles) {
    assertLocalized(article.title, `news article ${article.slug} title`);
    assertLocalized(article.summary, `news article ${article.slug} summary`);
    assertLocalizedStringArray(article.keywords, `news article ${article.slug} keywords`);
    assert(
      Array.isArray(article.keywords.en) && article.keywords.en.length >= 3,
      `${article.slug} keywords.en must include searchable terms`
    );
    assert(
      Array.isArray(article.keywords.zh) && article.keywords.zh.length >= 3,
      `${article.slug} keywords.zh must include searchable terms`
    );
    assert(typeof article.date === "string" && article.date, `${article.slug} date is required`);
    assert(Array.isArray(article.sections), `${article.slug} sections must be an array`);
    assert(article.sections.length >= 3, `${article.slug} should have useful article sections`);
  }

  assertContains(listPage, "news.json", "News list page");
  assertContains(listPage, "NewsSearch", "News list page");
  assertContains(searchComponent, "url(", "News search component links");
  assertContains(searchComponent, "data-news-form", "News search component");
  assertContains(searchComponent, 'type="search"', "News search component");
  assertContains(searchComponent, "data-placeholder-en", "News search component");
  assertContains(searchComponent, "data-placeholder-zh", "News search component");
  assertContains(searchComponent, "setSearchPlaceholder", "News search component");
  assertNotContains(searchComponent, 'placeholder="Search materials', "News search placeholder");
  assertContains(searchComponent, 'type="submit"', "News search component");
  assertContains(searchComponent, "data-news-card", "News search component");
  assertContains(searchComponent, "data-search-text", "News search component");
  assertContains(searchComponent, "data-news-empty", "News search component");
  assertContains(searchComponent, "data-news-submit", "News search component");
  assertContains(searchComponent, "data-news-clear", "News search component");
  assertContains(searchComponent, 'addEventListener("submit"', "News search component");
  assertContains(searchComponent, "aria-live", "News search component");
  assertContains(detailPage, "getStaticPaths", "News detail page");
  assertContains(detailPage, "news.json", "News detail page");
  assertContains(detailPage, "article.slug", "News detail page route data");
}

function assertProductTaxonomy() {
  const products = readJson("src/content/products.json");
  const showcase = readJson("src/content/showcase.json");
  const page = readText("src/pages/products.astro");

  const requiredCategories = [
    "Plastic Electronic Enclosures",
    "Industrial Plastic Components",
    "Smart Home & Small Appliance Parts",
    "Automotive Plastic Components",
    "Plastic & Metal Insert Molding Parts",
    "Custom Plastic Products",
    "Display Boxes",
  ];

  const categoryNames = products.categories.map((item) => item.title.en);
  for (const category of requiredCategories) {
    assert(categoryNames.includes(category), `products.categories must include ${category}`);
  }

  for (const category of products.categories) {
    assertLocalized(category.title, `product category ${category.no} title`);
    assertLocalized(category.desc, `product category ${category.no} desc`);
    assert(
      Array.isArray(category.examples) && category.examples.length >= 2,
      `product category ${category.no} needs buyer-facing examples`
    );
  }

  assertLocalized(products.cta.title, "products.cta.title");
  assert(
    Array.isArray(showcase.products) && showcase.products.length >= 10,
    "showcase must include at least ten product slots"
  );
  for (const product of showcase.products) {
    assertLocalized(product.title, `showcase product ${product.title?.en ?? "unknown"} title`);
    assertLocalized(product.material, `showcase product ${product.title.en} material`);
    assertLocalized(product.process, `showcase product ${product.title.en} process`);
    assertLocalized(product.alt, `showcase product ${product.title.en} alt`);
  }
  assertContains(page, "products.cta", "Products page");
  assertContains(page, "showcase.json", "Products page showcase");
  assertContains(page, "examples", "Products page category examples");
  assertContains(page, "/contact#quote", "Products page quote link");
}

function assertAboutDepth() {
  const about = readJson("src/content/about.json");
  const page = readText("src/pages/about.astro");

  assert(
    Array.isArray(about.profile?.paragraphs) && about.profile.paragraphs.length >= 2,
    "about.profile.paragraphs must include richer company introduction"
  );

  const requiredCapabilities = [
    "Electronic Plastic Housings",
    "Industrial Equipment Plastic Components",
    "Smart Home & Small Appliance Parts",
    "Automotive Small Plastic Parts",
    "Medical & Health Equipment Housings",
    "Hardware-Plastic Combined Parts",
    "Plastic Mold Design & Manufacturing",
  ];
  const capabilityNames = about.capabilities.items.map((item) => item.title.en);
  for (const capability of requiredCapabilities) {
    assert(capabilityNames.includes(capability), `about capabilities must include ${capability}`);
  }

  const requiredAdvantages = [
    "Manufacturing Experience",
    "Small & Medium Custom Parts",
    "OEM / ODM Support",
    "Stable Quality Control",
    "One-stop Manufacturing",
  ];
  const advantageNames = about.advantages.items.map((item) => item.title.en);
  for (const advantage of requiredAdvantages) {
    assert(advantageNames.includes(advantage), `about advantages must include ${advantage}`);
  }

  assert(
    Array.isArray(about.cooperation.industries) && about.cooperation.industries.length >= 6,
    "about cooperation directions must include target industries"
  );

  assertContains(page, "about.profile", "About page");
  assertContains(page, "about.capabilities", "About page");
  assertContains(page, "about.advantages", "About page");
  assertContains(page, "about.cooperation", "About page");
}

function assertHomeBuyerJourney() {
  const home = readJson("src/content/home.json");
  const page = readText("src/pages/index.astro");

  assertLocalized(home.productEntry.title, "home.productEntry.title");
  assert(
    Array.isArray(home.productEntry.featuredNos) && home.productEntry.featuredNos.length >= 3,
    "home.productEntry.featuredNos must include homepage product entries"
  );
  for (const no of ["01", "02", "05"]) {
    assert(home.productEntry.featuredNos.includes(no), `home product entry must include ${no}`);
  }

  assertLocalized(home.processPreview.title, "home.processPreview.title");
  assert(
    Array.isArray(home.processPreview.steps) && home.processPreview.steps.length >= 4,
    "home.processPreview.steps must outline buyer workflow"
  );

  const requiredTrustTitles = [
    "20+ Years Manufacturing Experience",
    "Up to 800T Injection Capacity",
    "OEM / ODM Project Support",
    "One-stop Manufacturing Workflow",
  ];
  const trustTitles = home.trustStats.map((item) => item.title.en);
  for (const title of requiredTrustTitles) {
    assert(trustTitles.includes(title), `home.trustStats must include ${title}`);
  }

  assertContains(page, "home.productEntry", "Home page product entry");
  assertContains(page, "featuredProducts", "Home page featured products");
  assertContains(page, "home.processPreview", "Home page process preview");
  assertContains(page, "home.trustStats", "Home page trust stats");
  assertContains(page, "/contact#quote", "Home page quote CTA");
}

function assertTopPageEyebrowsHidden() {
  const expectations = [
    ["src/pages/index.astro", "eyebrow={home.hero.eyebrow}", "Home hero"],
    ["src/pages/about.astro", "eyebrow={about.header.eyebrow}", "About page header"],
    ["src/pages/products.astro", "eyebrow={products.header.eyebrow}", "Products page header"],
    [
      "src/components/CapabilitiesPage.astro",
      "eyebrow={capabilities.hero.eyebrow}",
      "Capabilities hero",
    ],
    [
      "src/pages/materials-processes.astro",
      "eyebrow={materials.header.eyebrow}",
      "Materials page header",
    ],
    ["src/pages/industries.astro", "eyebrow={industries.header.eyebrow}", "Industries page header"],
    ["src/pages/news.astro", "eyebrow={news.header.eyebrow}", "News page header"],
    ["src/pages/showcase.astro", "eyebrow={showcase.header.eyebrow}", "Showcase page header"],
    ["src/pages/contact.astro", "eyebrow={contact.header.eyebrow}", "Contact hero"],
  ];

  for (const [file, hiddenEyebrow, label] of expectations) {
    assertNotContains(readText(file), hiddenEyebrow, label);
  }
}

function assertSeoAndEngineeringQuality() {
  const readme = readText("README.md");
  const baseLayout = readText("src/layouts/BaseLayout.astro");

  assert(!readme.includes("零运行时 JS"), "README must not claim zero runtime JS");
  assertContains(readme, "渐进增强", "README runtime description");

  assertContains(baseLayout, '"@type": "WebSite"', "BaseLayout JSON-LD");
  assertContains(baseLayout, "hasOfferCatalog", "BaseLayout offer catalog structured data");

  const hardcodedHexMatches = [];
  for (const file of listSourceFiles("src")) {
    const lines = readText(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (file === "src/styles/global.css" && line.includes("--color-")) return;
      const matches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (matches) {
        hardcodedHexMatches.push(`${file}:${index + 1} ${matches.join(", ")}`);
      }
    });
  }
  assert(
    hardcodedHexMatches.length === 0,
    `Hard-coded hex colors outside theme tokens:\n${hardcodedHexMatches.join("\n")}`
  );
}

const checks = [
  assertNavigationArchitecture,
  assertQuotePath,
  assertCapabilitiesPage,
  assertMaterialsProcessesPage,
  assertNewsSeoPages,
  assertProductTaxonomy,
  assertAboutDepth,
  assertHomeBuyerJourney,
  assertTopPageEyebrowsHidden,
  assertSeoAndEngineeringQuality,
];

for (const check of checks) {
  check();
}

console.log(`Content structure checks passed (${checks.length})`);
