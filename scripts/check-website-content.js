import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { inflateSync } from "node:zlib";

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

function readPngRgba(relativePath) {
  const absolutePath = path.join(root, "public", relativePath);
  const buffer = readFileSync(absolutePath);
  const signature = "89504e470d0a1a0a";
  assert(buffer.subarray(0, 8).toString("hex") === signature, `${relativePath} must be a PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  assert(bitDepth === 8 && colorType === 6, `${relativePath} must be 8-bit RGBA`);

  const inflated = inflateSync(Buffer.concat(idat));
  const channels = 4;
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let sourceOffset = 0;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;
    const previousRow = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = previousRow ? previousRow[i] : 0;
      const upLeft = previousRow && i >= channels ? previousRow[i - channels] : 0;

      if (filter === 1) row[i] = (row[i] + left) & 0xff;
      else if (filter === 2) row[i] = (row[i] + up) & 0xff;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[i] = (row[i] + paeth(left, up, upLeft)) & 0xff;
      else assert(filter === 0, `${relativePath} uses unsupported PNG filter ${filter}`);
    }

    row.copy(pixels, y * stride);
  }

  const alphaAt = (x, y) => pixels[(y * width + x) * channels + 3];
  let transparentPixels = 0;
  let opaquePixels = 0;
  for (let i = 3; i < pixels.length; i += channels) {
    if (pixels[i] === 0) transparentPixels += 1;
    if (pixels[i] > 240) opaquePixels += 1;
  }

  return { width, height, alphaAt, transparentPixels, opaquePixels };
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

function assertImageAsset(asset, label) {
  assert(asset && typeof asset === "object", `${label} must be an image asset object`);
  assert(typeof asset.src === "string" && asset.src.startsWith("images/"), `${label}.src`);
  assert(typeof asset.source === "string" && asset.source.startsWith("docs/"), `${label}.source`);
  assert(Number.isInteger(asset.width) && asset.width > 0, `${label}.width`);
  assert(Number.isInteger(asset.height) && asset.height > 0, `${label}.height`);
  assertLocalized(asset.alt, `${label}.alt`);
  assert(existsSync(path.join(root, "public", asset.src)), `${label}.src file must exist`);
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
    home.hero.secondaryCta.en === "Contact Us",
    "home hero secondary CTA should open the contact path"
  );
  assert(
    home.hero.secondaryCta.zh === "联系我们",
    "home hero secondary CTA should open the contact path"
  );

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

  assertContains(header, "min-[1180px]:flex", "Header desktop navigation breakpoint");
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

  assertContains(header, "min-[1180px]:flex", "Header desktop navigation breakpoint");
  assertContains(header, "min-[1180px]:hidden", "Header mobile navigation breakpoint");
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
  assertContains(searchComponent, "<a\n          data-reveal", "News search clickable card");
  assertContains(searchComponent, "href={url(`/news/${article.slug}`)}", "News search card link");
  assertContains(searchComponent, "data-news-card", "News search component");
  assertContains(searchComponent, "data-search-text", "News search component");
  assertNotContains(searchComponent, "Read Article", "News search card CTA");
  assertNotContains(searchComponent, "阅读文章", "News search card CTA");
  assertContains(searchComponent, "data-news-empty", "News search component");
  assertContains(searchComponent, "data-news-submit", "News search component");
  assertContains(searchComponent, "data-news-clear", "News search component");
  assertContains(searchComponent, 'addEventListener("submit"', "News search component");
  assertContains(searchComponent, "aria-live", "News search component");
  assertNotContains(searchComponent, "Showing all articles", "News search status");
  assertNotContains(searchComponent, "显示全部文章", "News search status");
  assertContains(detailPage, "getStaticPaths", "News detail page");
  assertContains(detailPage, "news.json", "News detail page");
  assertContains(detailPage, "article.slug", "News detail page route data");
  assertContains(detailPage, 'Icon name="chevronLeft"', "News detail back button");
  assertContains(detailPage, '<span lang="en">Back</span>', "News detail back button");
  assertContains(detailPage, '<span lang="zh">返回</span>', "News detail back button");
  assertNotContains(detailPage, "Back to News", "News detail back button");
  assertNotContains(detailPage, "返回新闻资讯", "News detail back button");
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
    assert(typeof category.coverImage === "string", `product category ${category.no} coverImage`);
    assert(
      Array.isArray(category.galleryImages) && category.galleryImages.length >= 1,
      `product category ${category.no} needs galleryImages`
    );
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
  assertContains(page, "ProductGallery", "Products page product gallery");
  assertContains(page, "/contact#quote", "Products page quote link");
}

function assertRealMediaAssets() {
  const media = readJson("src/content/media.json");
  const products = readJson("src/content/products.json");
  const showcase = readJson("src/content/showcase.json");
  const home = readJson("src/content/home.json");
  const about = readJson("src/content/about.json");
  const capabilities = readJson("src/content/capabilities.json");
  const industries = readJson("src/content/industries.json");
  const news = readJson("src/content/news.json");
  const sourceFiles = listSourceFiles("src").map((file) => [file, readText(file)]);

  assertImageAsset(media.banners?.home, "media.banners.home");
  assertImageAsset(media.banners?.productLine, "media.banners.productLine");
  assert(media.categories && typeof media.categories === "object", "media.categories");

  const expectedCounts = {
    electronicHousings: 9,
    industrialComponents: 8,
    smartHomeAppliance: 8,
    automotiveComponents: 8,
    insertMolding: 8,
    customPlasticProducts: 8,
    displayBoxes: 13,
  };

  for (const [key, count] of Object.entries(expectedCounts)) {
    const items = media.categories[key];
    assert(Array.isArray(items) && items.length === count, `media.categories.${key} count`);
    items.forEach((asset, index) => assertImageAsset(asset, `media.categories.${key}[${index}]`));
  }

  const allAssets = [
    media.banners.home,
    media.banners.productLine,
    ...Object.values(media.categories).flat(),
  ];
  assert(allAssets.length === 64, "all 64 client product images must be registered");
  const srcs = new Set(allAssets.map((asset) => asset.src));
  assert(srcs.size === allAssets.length, "media asset src values must be unique");

  const referencedIds = new Set();
  const register = (id, label) => {
    assert(typeof id === "string" && media.assetMap[id], `${label} must reference media.assetMap`);
    referencedIds.add(id);
  };

  register(home.hero.image, "home.hero.image");
  register(home.intro.image, "home.intro.image");
  home.coreSolutions.items.forEach((item, index) =>
    register(item.image, `home.coreSolutions.items[${index}].image`)
  );
  home.productEntry.featuredNos.forEach((no) => {
    const category = products.categories.find((item) => item.no === no);
    assert(category, `home featured product ${no}`);
    register(category.coverImage, `products.category.${no}.coverImage`);
  });

  products.categories.forEach((category) => {
    register(category.coverImage, `products.category.${category.no}.coverImage`);
    category.galleryImages.forEach((id) =>
      register(id, `products.category.${category.no}.galleryImages`)
    );
  });

  showcase.products.forEach((item, index) => register(item.image, `showcase.products[${index}]`));
  about.visuals.forEach((id, index) => register(id, `about.visuals[${index}]`));
  capabilities.gallery.forEach((item, index) =>
    register(item.image, `capabilities.gallery[${index}]`)
  );
  industries.industries.forEach((item, index) =>
    register(item.image, `industries.industries[${index}]`)
  );
  news.articles.forEach((article) => register(article.image, `news.articles.${article.slug}`));

  for (const id of Object.keys(media.assetMap)) {
    assert(referencedIds.has(id), `media asset ${id} must be used on a website page`);
  }

  const requiredComponents = [
    "src/components/ResponsiveImage.astro",
    "src/components/ProductGallery.astro",
    "src/components/ImageHero.astro",
  ];
  for (const component of requiredComponents) {
    assert(existsSync(path.join(root, component)), `${component} must exist`);
  }

  const placeholderUses = sourceFiles
    .filter(([file]) => !file.endsWith("PhotoPlaceholder.astro"))
    .filter(([, text]) => text.includes("PhotoPlaceholder"))
    .map(([file]) => file);
  assert(
    placeholderUses.length === 0,
    `PhotoPlaceholder must not be used by production pages/components:\n${placeholderUses.join(
      "\n"
    )}`
  );
}

function assertLegacyRoutesCanonical() {
  const baseLayout = readText("src/layouts/BaseLayout.astro");
  const legacyRoutes = [
    ["src/pages/services.astro", "/capabilities"],
    ["src/pages/mold-capability.astro", "/capabilities"],
    ["src/pages/showcase.astro", "/products"],
  ];

  assertContains(baseLayout, "canonicalPath", "BaseLayout canonical override");
  for (const [file, canonicalPath] of legacyRoutes) {
    const text = readText(file);
    assertContains(text, `canonicalPath="${canonicalPath}"`, `${file} canonicalPath`);
  }
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

  assertLocalized(home.coreSolutions.title, "home.coreSolutions.title");
  assert(
    Array.isArray(home.coreSolutions.items) && home.coreSolutions.items.length === 4,
    "home.coreSolutions.items must include the reference-style four core solutions"
  );
  for (const item of home.coreSolutions.items) {
    assertLocalized(item.title, "home.coreSolutions item title");
    assertLocalized(item.desc, "home.coreSolutions item desc");
    assert(typeof item.image === "string" && item.image, "home.coreSolutions item image");
    assert(typeof item.href === "string" && item.href.startsWith("/"), "home.coreSolutions href");
  }

  assertLocalized(home.processPreview.title, "home.processPreview.title");
  assert(
    Array.isArray(home.processPreview.steps) && home.processPreview.steps.length >= 4,
    "home.processPreview.steps must outline buyer workflow"
  );

  assertContains(page, "home.coreSolutions", "Home page core solutions");
  assertContains(page, "HomeSolutionCard", "Home page solution cards");
  assertContains(page, "home.processPreview", "Home page process preview");
  assertContains(page, "home.capabilityStrip", "Home page capability strip");
  assertContains(page, "/contact#quote", "Home page quote CTA");
}

function assertHomeVisualRefinement() {
  const home = readJson("src/content/home.json");
  const media = readJson("src/content/media.json");
  const mediaText = readText("src/content/media.json");
  const page = readText("src/pages/index.astro");
  const hero = readText("src/components/HomeHero.astro");
  const oldJpgBanner = path.join(root, "public", "images/products/banner-home.jpg");
  const oldWebpBanner = path.join(root, "public", "images/products/banner-home.webp");
  const oldCleanBanner = path.join(root, "public", "images/products/banner-home-clean.webp");
  const oldTransparentBanner = path.join(
    root,
    "public",
    "images/products/banner-home-transparent.png"
  );

  assert(
    media.banners.home.src === "images/products/banner-home.png",
    "home banner must use the source PNG background image"
  );
  assert(
    media.banners.home.source === "docs/产品画册/产品图片/首页Banner图.png",
    "home banner source must be the client PNG"
  );
  assert(
    media.banners.home.width === 1672 && media.banners.home.height === 941,
    "home banner dimensions must match the client PNG"
  );
  assert(
    existsSync(path.join(root, "public", media.banners.home.src)),
    "PNG home banner background file must exist"
  );
  assertNotContains(mediaText, "首页Banner图.jpg", "Home media registry");
  assertNotContains(mediaText, "banner-home.jpg", "Home media registry");
  assertNotContains(mediaText, "banner-home.webp", "Home media registry");
  assertNotContains(mediaText, "banner-home-transparent.png", "Home media registry");
  assertNotContains(mediaText, "banner-home-clean.webp", "Home media registry");
  assert(!existsSync(oldJpgBanner), "unused banner-home.jpg should be removed");
  assert(!existsSync(oldWebpBanner), "unused banner-home.webp should be removed");
  assert(!existsSync(oldCleanBanner), "unused banner-home-clean.webp should be removed");
  assert(!existsSync(oldTransparentBanner), "abandoned transparent banner PNG should be removed");
  assert(home.hero.image === "homeBanner", "home.hero.image must keep the registered home banner");

  assertContains(page, "HomeHero", "Home page must use the dedicated home hero");
  assertNotContains(page, "ImageHero", "Home page must not use the generic framed ImageHero");
  assertNotContains(
    page,
    "ProductTaxonomyCard",
    "Home page product images should not use framed taxonomy cards"
  );
  assertContains(page, "home.coreSolutions", "Home page must render the reference-style solutions");
  assertContains(
    page,
    "home.capabilityStrip",
    "Home page must render the reference-style capability strip"
  );
  assertContains(
    hero,
    "home-hero__background",
    "Home hero must render the PNG as a single background layer"
  );
  assertContains(
    hero,
    "src={url(image.src)}",
    "Home hero background image must use url() for base path safety"
  );
  assertContains(
    hero,
    "object-fit: cover",
    "Home hero desktop background image must span the full hero without a visible image edge"
  );
  assertContains(
    hero,
    "clamp(620px, calc(100vw * 941 / 1672), 760px)",
    "Home hero desktop height must follow the PNG ratio enough to avoid harsh product cropping"
  );
  assertNotContains(
    hero,
    "background: linear-gradient",
    "Home hero must not add an extra gradient behind the source PNG"
  );
  assertNotContains(
    hero,
    "home-hero__product-field",
    "Home hero must not keep the transparent-image white support field"
  );
  assertNotContains(hero, "home-hero__wash", "Home hero must not keep the extra wash layer");
  assertNotContains(hero, "home-hero__curve", "Home hero must not keep the blue curve layer");
  assertNotContains(hero, "home-hero__media", "Home hero must not keep the middle cutout layer");
  assertNotContains(hero, "home-hero__art", "Home hero must not keep the cutout product art layer");

  assert(
    Array.isArray(home.coreSolutions?.items) && home.coreSolutions.items.length === 4,
    "home.coreSolutions.items must include four homepage solution cards"
  );
  assert(
    Array.isArray(home.capabilityStrip?.items) && home.capabilityStrip.items.length === 4,
    "home.capabilityStrip.items must include four capability items"
  );

  assertNotContains(hero, "shadow-2xl", "Home hero must not frame the banner with a heavy shadow");
  assertNotContains(hero, "bg-white p-2", "Home hero must not wrap the banner in a white frame");
  assertNotContains(
    hero,
    "home-hero__machine-line",
    "Home hero must not render transparent placeholder-like frames"
  );
  assertNotContains(
    hero,
    "mask-image",
    "Home hero must not use a circular mask that clips the source PNG"
  );
  assertContains(hero, "home-hero__copy", "Home hero copy must sit above the PNG background image");
  assertContains(
    hero,
    "pointer-events-none",
    "Home hero background image should not block text CTA interactions"
  );
  assertNotContains(hero, "drop-shadow", "Home hero must rely on the source PNG's natural shadows");
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
  assertRealMediaAssets,
  assertLegacyRoutesCanonical,
  assertAboutDepth,
  assertHomeBuyerJourney,
  assertHomeVisualRefinement,
  assertTopPageEyebrowsHidden,
  assertSeoAndEngineeringQuality,
];

for (const check of checks) {
  check();
}

console.log(`Content structure checks passed (${checks.length})`);
