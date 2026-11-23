import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = path.resolve(process.cwd(), 'src/assets/images');

async function optimizeImages() {
  const entries = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
  const targets = entries.filter((e) => e.isFile() && /\.(jpe?g|png)$/i.test(e.name));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const entry of targets) {
    const srcPath = path.join(IMAGES_DIR, entry.name);
    const outName = entry.name.replace(/\.(jpe?g|png)$/i, '.webp');
    const outPath = path.join(IMAGES_DIR, outName);

    const statBefore = await fs.stat(srcPath);
    totalBefore += statBefore.size;

    await sharp(srcPath)
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);

    const statAfter = await fs.stat(outPath);
    totalAfter += statAfter.size;
    console.log(
      `${entry.name} (${(statBefore.size / 1024).toFixed(1)} KB) -> ${outName} (${(statAfter.size / 1024).toFixed(1)} KB)`
    );
  }

  console.log(
    `Optimized ${targets.length} images: ${(totalBefore / (1024 * 1024)).toFixed(2)} MB -> ${(totalAfter / (1024 * 1024)).toFixed(2)} MB`
  );
}

optimizeImages().catch((err) => {
  console.error('Image optimization failed:', err);
  process.exit(1);
});
