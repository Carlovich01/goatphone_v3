import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import {
  NUMERIC_SPEC_KEYS,
  BOOLEAN_SPEC_KEYS,
  CATEGORICAL_SPECS,
} from '../../../packages/shared/src/specs';

// --- minimal .env loader (root .env) so ts-node has DATABASE_URL / admin creds ---
function loadEnv() {
  const candidates = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadEnv();

const prisma = new PrismaClient();

const CSV_PATH = path.resolve(__dirname, '../../../imputed_final.csv');

// Map CSV header -> Prisma field name
const COLUMN_MAP: Record<string, string> = {
  pos: 'pos',
  brand: 'brand',
  model: 'model',
  price: 'price',
  rating: 'rating',
  'Dual Sim': 'dualSim',
  '3G': 'has3g',
  '4G': 'has4g',
  '5G': 'has5g',
  VoLTE: 'volte',
  Vo5G: 'vo5g',
  'Wi-Fi': 'wifi',
  NFC: 'nfc',
  'IR Blaster': 'irBlaster',
  processor_core: 'processorCore',
  processor_speed_in_GHz: 'processorSpeedGhz',
  Ram: 'ram',
  storage: 'storage',
  battery_capacity: 'batteryCapacity',
  is_fast_charging: 'isFastCharging',
  fast_charging_capacity: 'fastChargingCapacity',
  display_size: 'displaySize',
  display_refresh_rate: 'displayRefreshRate',
  camera_notch_type: 'cameraNotchType',
  pixel_width: 'pixelWidth',
  pixel_height: 'pixelHeight',
  display_ppi: 'displayPpi',
  os: 'os',
  is_memory_card_supported: 'isMemoryCardSupported',
  max_card_gb: 'maxCardGb',
  primary_rear_mp: 'primaryRearMp',
  primary_front_mp: 'primaryFrontMp',
  num_rear_cameras: 'numRearCameras',
  num_front_cameras: 'numFrontCameras',
  processor_brand: 'processorBrand',
  processor_model: 'processorModel',
};

const BOOL_FIELDS = new Set([
  'dualSim', 'has3g', 'has4g', 'has5g', 'volte', 'vo5g', 'wifi', 'nfc',
  'irBlaster', 'isFastCharging', 'isMemoryCardSupported',
]);
const STRING_FIELDS = new Set([
  'brand', 'model', 'cameraNotchType', 'os', 'processorBrand', 'processorModel',
]);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function toBool(v: string): boolean {
  return /^true$/i.test(v.trim());
}
function toNum(v: string): number | null {
  const t = v.trim();
  if (t === '' || /^(nan|null|none)$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

async function main() {
  console.log('Seeding GOATPHONE database...');
  console.log('CSV:', CSV_PATH);

  // Ensure pgvector extension exists (idempotent)
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(raw);
  const header = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.length >= header.length - 1 && r.some((c) => c !== ''));

  console.log(`Parsed ${dataRows.length} data rows, ${header.length} columns.`);

  const records: any[] = dataRows.map((cols) => {
    const rec: any = {};
    header.forEach((h, i) => {
      const field = COLUMN_MAP[h.trim()];
      if (!field) return;
      const val = cols[i] ?? '';
      if (BOOL_FIELDS.has(field)) rec[field] = toBool(val);
      else if (STRING_FIELDS.has(field)) rec[field] = val.trim() || (field === 'brand' || field === 'model' ? 'Unknown' : null);
      else rec[field] = toNum(val);
    });
    return rec;
  });

  // Reset dataset (keep idempotent for re-seeds)
  await prisma.specStat.deleteMany();
  // Note: products reference dataset_phones; only wipe dataset if no products yet
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.datasetPhone.deleteMany();
    // chunked insert
    const chunkSize = 200;
    for (let i = 0; i < records.length; i += chunkSize) {
      await prisma.datasetPhone.createMany({ data: records.slice(i, i + chunkSize) });
    }
    console.log(`Inserted ${records.length} dataset_phones.`);
  } else {
    console.log(`Skipped dataset_phones insert (${productCount} products reference it). Recomputing stats only.`);
  }

  // ---- Compute spec_stats over the full dataset ----
  const all = await prisma.datasetPhone.findMany();

  // numeric specs
  for (const key of NUMERIC_SPEC_KEYS) {
    const vals = all
      .map((p: any) => p[key])
      .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v));
    if (vals.length === 0) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p01 = percentile(sorted, 1);
    const p99 = percentile(sorted, 99);

    // histogram: 12 buckets between p01..p99 (clamp outliers into edge buckets)
    const nBuckets = 12;
    const lo = p01;
    const hi = p99 > lo ? p99 : max > lo ? max : lo + 1;
    const width = (hi - lo) / nBuckets || 1;
    const buckets = Array.from({ length: nBuckets }, (_, b) => ({
      rangeStart: lo + b * width,
      rangeEnd: lo + (b + 1) * width,
      count: 0,
      label: `${Math.round((lo + b * width) * 10) / 10}-${Math.round((lo + (b + 1) * width) * 10) / 10}`,
    }));
    for (const v of vals) {
      let b = Math.floor((v - lo) / width);
      if (b < 0) b = 0;
      if (b >= nBuckets) b = nBuckets - 1;
      buckets[b].count++;
    }

    await prisma.specStat.create({
      data: {
        specKey: key,
        type: 'quantitative',
        count: vals.length,
        min, max, mean,
        stddev: Math.sqrt(variance),
        p01,
        p25: percentile(sorted, 25),
        p50: percentile(sorted, 50),
        p75: percentile(sorted, 75),
        p99,
        buckets: buckets as any,
      },
    });
  }

  // boolean specs
  for (const key of BOOLEAN_SPEC_KEYS) {
    let yes = 0;
    let no = 0;
    for (const p of all as any[]) (p[key] ? yes++ : no++);
    await prisma.specStat.create({
      data: {
        specKey: key,
        type: 'boolean',
        count: all.length,
        categories: [
          { category: 'Si', count: yes },
          { category: 'No', count: no },
        ] as any,
      },
    });
  }

  // categorical specs
  for (const key of CATEGORICAL_SPECS) {
    const counts = new Map<string, number>();
    for (const p of all as any[]) {
      const v = (p[key] ?? 'Desconocido') as string;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const categories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
    await prisma.specStat.upsert({
      where: { specKey: key },
      create: { specKey: key, type: 'categorical', count: all.length, categories: categories as any },
      update: { type: 'categorical', count: all.length, categories: categories as any },
    });
  }

  console.log('spec_stats computed.');

  // ---- Admin user ----
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@goatphone.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash, name: 'Administrador', role: 'admin' },
    update: { passwordHash, role: 'admin' },
  });
  console.log(`Admin ready: ${adminEmail} / ${adminPassword}`);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
