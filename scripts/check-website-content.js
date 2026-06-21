import { existsSync, readFileSync } from "node:fs";
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

function assertContains(text, expected, label) {
  assert(text.includes(expected), `${label} must contain "${expected}"`);
}

function assertQuotePath() {
  const site = readJson("src/content/site.json");
  const home = readJson("src/content/home.json");
  const quote = readJson("src/content/quote.json");
  const header = readText("src/components/Header.astro");
  const index = readText("src/pages/index.astro");

  assert(site.quoteCta?.href === "/#quote", "site.quoteCta.href must point to /#quote");
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
  assertContains(index, "QuoteSection", "Home page");
  assertContains(index, "primaryCta", "Home page hero");

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
  assertContains(page, "/#quote", "Materials page quote link");

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
  ];
  const processNames = materials.processes.map((item) => item.title.en);
  for (const process of requiredProcesses) {
    assert(processNames.includes(process), `process list must include ${process}`);
  }
}

const checks = [assertQuotePath, assertMaterialsProcessesPage];

for (const check of checks) {
  check();
}

console.log(`Content structure checks passed (${checks.length})`);
