import { PrismaClient } from "@prisma/client";
import { convertImageToWebp } from "../lib/imageConversion";

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: { kind: "IMAGE", NOT: { mime: "image/webp" } },
    select: { id: true, mime: true, data: true, size: true, originalName: true },
  });

  console.log(`Encontradas ${assets.length} imágenes candidatas a convertir a webp.`);

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  for (const asset of assets) {
    try {
      const result = await convertImageToWebp(asset.data, asset.originalName);
      if (result.mime === asset.mime) {
        skipped++;
        continue;
      }

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          data: new Uint8Array(result.data),
          mime: result.mime,
          size: result.data.length,
          originalName: result.originalName,
        },
      });

      bytesBefore += asset.size;
      bytesAfter += result.data.length;
      converted++;
      console.log(
        `  ok ${asset.id}: ${asset.mime} (${asset.size}B) -> webp (${result.data.length}B)`,
      );
    } catch (err) {
      failed++;
      console.error(`  fallo ${asset.id}:`, err);
    }
  }

  console.log(
    `Hecho. Convertidas: ${converted}, saltadas (svg/gif/ya webp): ${skipped}, fallidas: ${failed}.`,
  );
  if (converted > 0 && bytesBefore > 0) {
    const pct = (((bytesBefore - bytesAfter) / bytesBefore) * 100).toFixed(1);
    console.log(`Peso total: ${bytesBefore}B -> ${bytesAfter}B (-${pct}%).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
