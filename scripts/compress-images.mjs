/**
 * One-off: compress public raster images with sharp (in place).
 * Run: node scripts/compress-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("public");
const APP = path.resolve("app");
const EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Max long-edge by filename pattern */
function maxEdge(file) {
  const n = file.toLowerCase();
  if (n.includes("logo") || n.includes("favicon") || n.includes("icon")) return 512;
  if (n.includes("landing-hero") || n.includes("hero") || n.startsWith("bg_")) return 1920;
  if (n.includes("card_") || n.includes("feature_") || n.includes("workflow_")) return 1200;
  if (n.includes("doc_") || n.includes("patient") || n.includes("online_") || n.includes("wellness"))
    return 1600;
  return 1400;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function compressFile(file) {
  const before = fs.statSync(file).size;
  if (before < 40 * 1024) return { file, skipped: true, reason: "small" };

  const ext = path.extname(file).toLowerCase();
  const edge = maxEdge(path.basename(file));
  const tmp = `${file}.tmp-compress`;

  let pipeline = sharp(file, { failOn: "none" }).rotate().resize({
    width: edge,
    height: edge,
    fit: "inside",
    withoutEnlargement: true,
  });

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, quality: 80, palette: false });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 80 });
  } else {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  }

  await pipeline.toFile(tmp);
  const after = fs.statSync(tmp).size;

  if (after >= before * 0.98) {
    fs.unlinkSync(tmp);
    return { file, skipped: true, reason: "no-gain", before, after };
  }

  fs.renameSync(tmp, file);
  return { file, before, after, saved: before - after };
}

const files = [...walk(ROOT), ...walk(APP).filter((f) => /icon|favicon/i.test(f))];

let savedTotal = 0;
let compressed = 0;

for (const file of files) {
  try {
    const r = await compressFile(file);
    if (r.skipped) {
      console.log(`skip  ${path.relative(process.cwd(), file)} (${r.reason})`);
      continue;
    }
    compressed++;
    savedTotal += r.saved;
    console.log(
      `ok    ${path.relative(process.cwd(), file)}  ${(r.before / 1024).toFixed(0)}KB → ${(r.after / 1024).toFixed(0)}KB  (−${(r.saved / 1024).toFixed(0)}KB)`
    );
  } catch (err) {
    console.error(`fail  ${path.relative(process.cwd(), file)}: ${err.message}`);
  }
}

console.log(
  `\nDone. Compressed ${compressed} files, saved ${(savedTotal / 1024 / 1024).toFixed(2)} MB`
);
