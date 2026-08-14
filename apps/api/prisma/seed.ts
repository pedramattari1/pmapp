import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Frequency, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// pm-seed.json lives at the repo root; this file is apps/api/prisma/seed.ts.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "../../../pm-seed.json");

interface SeedAsset {
  name: string;
  category: string;
  location: string;
}

interface SeedReading {
  type: string;
  unit: string;
}

interface SeedTemplate {
  title: string;
  category: string;
  frequency: keyof typeof Frequency;
  weekday?: number;
  dayOfMonth?: number;
  asset?: string;
  checklist: string[];
  requiredReadings: SeedReading[];
}

interface SeedFile {
  assets: SeedAsset[];
  templates: SeedTemplate[];
}

async function main(): Promise<void> {
  const raw = readFileSync(SEED_PATH, "utf8");
  const data = JSON.parse(raw) as SeedFile;

  // 1) Assets — upsert by name (the natural key templates reference).
  for (const asset of data.assets) {
    await prisma.asset.upsert({
      where: { name: asset.name },
      update: {
        category: asset.category,
        location: asset.location,
      },
      create: {
        name: asset.name,
        category: asset.category,
        location: asset.location,
      },
    });
  }

  // Map asset name -> id for template resolution.
  const assets = await prisma.asset.findMany({ select: { id: true, name: true } });
  const assetIdByName = new Map(assets.map((a) => [a.name, a.id]));

  // 2) Templates — upsert by title; idempotent.
  for (const t of data.templates) {
    const assetId = t.asset ? assetIdByName.get(t.asset) : undefined;
    if (t.asset && !assetId) {
      throw new Error(
        `Template "${t.title}" references unknown asset "${t.asset}"`,
      );
    }

    const fields = {
      category: t.category,
      frequency: Frequency[t.frequency],
      checklistItems: t.checklist,
      requiredReadings: t.requiredReadings,
      weekday: t.weekday ?? null,
      dayOfMonth: t.dayOfMonth ?? null,
      active: true,
      assetId: assetId ?? null,
    };

    await prisma.pMTemplate.upsert({
      where: { title: t.title },
      update: fields,
      create: { title: t.title, ...fields },
    });
  }

  // Summary
  const [assetCount, daily, weekly, monthly] = await Promise.all([
    prisma.asset.count(),
    prisma.pMTemplate.count({ where: { frequency: Frequency.DAILY } }),
    prisma.pMTemplate.count({ where: { frequency: Frequency.WEEKLY } }),
    prisma.pMTemplate.count({ where: { frequency: Frequency.MONTHLY } }),
  ]);

  console.log(
    `Seeded ${assetCount} assets and ${daily + weekly + monthly} templates ` +
      `(${daily} daily, ${weekly} weekly, ${monthly} monthly).`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
