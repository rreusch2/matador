import { supabaseAuth } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import type { CatalogExercise } from './exercises.library.js';

const PAGE = 1000;
const TTL_MS = 30 * 60 * 1000;

const COLUMNS =
  'slug, name, demo, app_level, target_muscle_group, prime_mover_muscle, primary_equipment, secondary_equipment, movement_patterns, body_region, mechanics, classification, combination';

type Row = {
  slug: string;
  name: string;
  demo: string | null;
  app_level: string | null;
  target_muscle_group: string | null;
  prime_mover_muscle: string | null;
  primary_equipment: string | null;
  secondary_equipment: string | null;
  movement_patterns: string | null;
  body_region: string | null;
  mechanics: string | null;
  classification: string | null;
  combination: string | null;
};

/** Pulls the 11-character video id out of youtu.be, watch, embed and shorts links. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

const LEVELS = new Set(['beginner', 'intermediate', 'advanced']);

function toExercise(row: Row): CatalogExercise {
  const level = (row.app_level ?? '').toLowerCase();
  return {
    slug: row.slug,
    name: row.name.trim(),
    videoId: youtubeId(row.demo),
    level: (LEVELS.has(level) ? level : 'intermediate') as CatalogExercise['level'],
    target: row.target_muscle_group ?? '',
    primeMover: row.prime_mover_muscle ?? '',
    primaryEquipment: row.primary_equipment ?? '',
    secondaryEquipment: row.secondary_equipment ?? '',
    patterns: (row.movement_patterns ?? '').split('|').filter(Boolean),
    region: row.body_region ?? '',
    mechanics: row.mechanics ?? '',
    classification: row.classification ?? '',
    combo: (row.combination ?? '').toLowerCase().startsWith('combo'),
  };
}

async function fetchAll(): Promise<CatalogExercise[]> {
  const out: CatalogExercise[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAuth
      .from('exercises')
      .select(COLUMNS)
      .order('slug')
      .range(from, from + PAGE - 1)
      .returns<Row[]>();
    if (error) throw error;
    out.push(...(data ?? []).map(toExercise));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

let cache: { at: number; list: CatalogExercise[] } | null = null;
let inflight: Promise<CatalogExercise[]> | null = null;

/** The whole exercise table, cached in memory. It is small and rarely changes. */
export async function loadCatalog(): Promise<CatalogExercise[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  if (!inflight) {
    inflight = fetchAll()
      .then((list) => {
        cache = { at: Date.now(), list };
        logger.info({ exercises: list.length }, 'exercise catalog loaded');
        return list;
      })
      .finally(() => {
        inflight = null;
      });
  }
  try {
    return await inflight;
  } catch (err) {
    // A stale catalog beats no catalog.
    if (cache) return cache.list;
    throw err;
  }
}
