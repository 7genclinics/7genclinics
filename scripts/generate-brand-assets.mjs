import sharp from "sharp";
import fs from "fs";

const SRC = "public/apnaclinic-logo.png";

async function contentBox(img) {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const isBg = a < 12 || (r > 248 && g > 248 && b > 248);
      if (!isBg) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function writeSquareIcon(srcBuffer, size, outPath, pad = 0.14) {
  const inner = Math.max(1, Math.round(size * (1 - pad * 2)));
  const embed = await sharp(srcBuffer)
    .resize({
      width: inner,
      height: inner,
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: embed, gravity: "centre" }])
    .png()
    .toFile(outPath);
}

const box = await contentBox(sharp(SRC));
console.log("content box", box);

const trimmed = await sharp(SRC).extract(box).png().toBuffer();
const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const rowDensity = [];
for (let y = 0; y < info.height; y++) {
  let ink = 0;
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const isBg = a < 12 || (r > 248 && g > 248 && b > 248);
    if (!isBg) ink++;
  }
  rowDensity.push(ink / info.width);
}

let split = Math.round(info.height * 0.62);
for (let y = Math.round(info.height * 0.45); y < Math.round(info.height * 0.8); y++) {
  if (rowDensity[y] < 0.01) {
    let streak = 0;
    for (let k = y; k < info.height && rowDensity[k] < 0.02; k++) streak++;
    if (streak >= 6) {
      split = y;
      break;
    }
  }
}
console.log("icon split y", split, "of", info.height);

const iconRaw = await sharp(trimmed)
  .extract({ left: 0, top: 0, width: info.width, height: split })
  .trim({ threshold: 10 })
  .png()
  .toBuffer();

const iconRawMeta = await sharp(iconRaw).metadata();
const iw = iconRawMeta.width || 1;
const ih = iconRawMeta.height || 1;
const side = Math.min(iw, ih);
const iconBuf = await sharp(iconRaw)
  .extract({
    left: Math.max(0, Math.round((iw - side) / 2)),
    top: Math.max(0, Math.round((ih - side) / 2)),
    width: side,
    height: side,
  })
  .png()
  .toBuffer();

const iconMeta = await sharp(iconBuf).metadata();
console.log("icon meta", iconMeta.width, iconMeta.height);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([
    {
      input: await sharp(trimmed).resize({ width: 900, height: 420, fit: "inside" }).png().toBuffer(),
      gravity: "centre",
    },
  ])
  .png()
  .toFile("public/og-image.png");

const sizes = [
  ["public/logo-32.png", 32],
  ["public/logo-48.png", 48],
  ["public/logo-96.png", 96],
  ["public/logo-144.png", 144],
  ["public/logo-192.png", 192],
  ["public/logo-512.png", 512],
  ["public/apnaclinic-favicon.png", 512],
  ["app/icon.png", 512],
  ["app/apple-icon.png", 180],
];

for (const [out, size] of sizes) {
  await writeSquareIcon(iconBuf, size, out);
  console.log("wrote", out);
}

// Keep a copy under old favicon path temporarily is unnecessary — refs will move.

console.log("done");
