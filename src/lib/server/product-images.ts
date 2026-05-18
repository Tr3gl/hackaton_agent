import "server-only";

import fs from "node:fs";
import path from "node:path";

type Gender = "men" | "women";

type ImageLookup = {
  lineNum: number;
  gender: Gender;
};

const CACHE: { map: Map<string, ImageLookup> | null } = { map: null };

function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

function loadFromJson(filePath: string, gender: Gender): Map<string, ImageLookup> {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return new Map();
    const map = new Map<string, ImageLookup>();
    parsed.forEach((item: any) => {
      const url = typeof item?.product_url === "string" ? item.product_url.trim() : "";
      const lineNum = Number(item?._lineNum);
      if (!url || !Number.isFinite(lineNum)) return;
      getUrlKeys(url).forEach((key) => map.set(key, { lineNum, gender }));
    });
    return map;
  } catch {
    return new Map();
  }
}

function loadFromRegex(filePath: string, gender: Gender): Map<string, ImageLookup> {
  const text = fs.readFileSync(filePath, "utf8");
  const lineNums = Array.from(text.matchAll(/"_lineNum"\s*:\s*(\d+)/g)).map((m) => Number(m[1]));
  const urls = Array.from(text.matchAll(/"product_url"\s*:\s*"([^"]+)"/g)).map((m) => m[1].trim());

  const map = new Map<string, ImageLookup>();
  const count = Math.min(lineNums.length, urls.length);
  for (let i = 0; i < count; i += 1) {
    const url = urls[i];
    const lineNum = lineNums[i];
    if (!url || !Number.isFinite(lineNum)) continue;
    getUrlKeys(url).forEach((key) => map.set(key, { lineNum, gender }));
  }

  return map;
}

function loadLookupMap(): Map<string, ImageLookup> {
  if (CACHE.map) return CACHE.map;

  const root = repoRoot();
  const menPath = path.join(root, "enrichment", "enriched-men_OLD_ALREADY.json");
  const womenPath = path.join(root, "enrichment", "enriched-women_OLD_ALREADY.json");

  const map = new Map<string, ImageLookup>();

  if (fs.existsSync(menPath)) {
    const menMap = loadFromJson(menPath, "men");
    const source = menMap.size > 0 ? menMap : loadFromRegex(menPath, "men");
    source.forEach((value, key) => map.set(key, value));
  }

  if (fs.existsSync(womenPath)) {
    const womenMap = loadFromJson(womenPath, "women");
    const source = womenMap.size > 0 ? womenMap : loadFromRegex(womenPath, "women");
    source.forEach((value, key) => map.set(key, value));
  }

  CACHE.map = map;
  return map;
}

export function getLocalProductImages(productUrl: string | null | undefined): { primary: string | null; images: string[] } {
  if (!productUrl) return { primary: null, images: [] };

  const keys = getUrlKeys(productUrl);
  const lookupMap = loadLookupMap();
  const lookup = keys.map((key) => lookupMap.get(key)).find(Boolean);
  if (!lookup) return { primary: null, images: [] };

  const photoIndex = lookup.lineNum + 1;
  const url = `/product-images/${lookup.gender}/${photoIndex}`;
  return { primary: url, images: [url] };
}

export function getRemoteProductImages(
  productUrl: string | null | undefined,
  imageUrl: string | null | undefined
): { primary: string | null; images: string[] } {
  const cleanedImage = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (cleanedImage) {
    return { primary: cleanedImage, images: [cleanedImage] };
  }

  const sku = extractMaviSku(productUrl);
  if (!sku) return { primary: null, images: [] };

  const url = `https://sky-static.mavi.com/mnresize/820/1162/${sku}_image_1.jpg`;
  return { primary: url, images: [url] };
}

function normalizeProductUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const cleanPath = url.pathname.replace(/\/$/, "");
    return `${url.origin}${cleanPath}`;
  } catch {
    return trimmed.replace(/\/$/, "");
  }
}

function getUrlKeys(raw: string): string[] {
  const primary = normalizeProductUrl(raw);
  if (!primary) return [];

  const keys = new Set<string>([primary]);

  const match = primary.match(/\/p\/(0+\d+-\d+)/);
  if (match?.[1]) {
    const deZeroed = match[1].replace(/^0+/, "");
    keys.add(primary.replace(match[1], deZeroed));
  }

  return Array.from(keys);
}

function extractMaviSku(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalizeProductUrl(raw);
  if (!normalized) return null;
  const match = normalized.match(/\/p\/([^/?#]+)/);
  return match?.[1] || null;
}
