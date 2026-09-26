import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '../../lib/logger.js';
import { HttpError } from '../../lib/errors.js';
import type { GenerateInput } from './workouts.schema.js';

export type CatalogRow = {
  slug: string;
  name: string;
  demo: string | null;
  app_level: string | null;
  app_equipment: string | null;
  body_region: string | null;
  target_muscle_group: string | null;
  movement_patterns: string | null;
  primary_equipment: string | null;
  force_type: string | null;
  classification: string | null;
};

const SELECT =
  'slug, name, demo, app_level, app_equipment, body_region, target_muscle_group, movement_patterns, primary_equipment, force_type, classification';

const LEVEL_OK: Record<GenerateInput['level'], string[]> = {
  beginner: ['beginner'],
  intermediate: ['beginner', 'intermediate'],
  advanced: ['beginner', 'intermediate', 'advanced'],
};

const FOCUS_OR: Record<GenerateInput['focus'], string | null> = {
  full: null,
  upper: 'body_region.eq.Upper Body,body_region.eq.Full Body',
  lower: 'body_region.eq.Lower Body,body_region.eq.Full Body',
  core: 'body_region.eq.Core,target_muscle_group.eq.Abdominals',
  push:
    'force_type.ilike.%Push%,target_muscle_group.in.(Chest,Shoulders,Triceps),movement_patterns.ilike.%Push%',
  pull: 'force_type.ilike.%Pull%,target_muscle_group.in.(Back,Biceps,Trapezius),movement_patterns.ilike.%Pull%',
};

const PROMPT_CAP = 140;

function hasDemo(row: CatalogRow) {
  return !!row.demo && /^https?:\/\//i.test(row.demo);
}

function merge(into: Map<string, CatalogRow>, rows: CatalogRow[] | null) {
  for (const row of rows ?? []) {
    if (row.slug && !into.has(row.slug)) into.set(row.slug, row);
  }
}

async function fetchSlice(
  db: SupabaseClient,
  input: GenerateInput,
  opts: { focus: boolean; mobility: boolean; limit: number }
): Promise<CatalogRow[]> {
  let q = db
    .from('exercises')
    .select(SELECT)
    .ilike('app_equipment', `%${input.equipment}%`)
    .in('app_level', LEVEL_OK[input.level])
    .limit(opts.limit);

  if (opts.focus) {
    const or = FOCUS_OR[input.focus];
    if (or) q = q.or(or);
  }
  if (opts.mobility) {
    q = q.or(
      'classification.eq.Mobility,classification.eq.Postural,movement_patterns.ilike.%Isometric%,body_region.eq.Core'
    );
  }

  const { data, error } = await q.returns<CatalogRow[]>();
  if (error) {
    logger.error({ err: error }, 'catalog query failed');
    throw new HttpError(500, 'db_error', 'Could not load the exercise library.');
  }
  return data ?? [];
}

/** Filtered subset of the catalog, sized for the model prompt. */
export async function loadCatalog(db: SupabaseClient, input: GenerateInput): Promise<CatalogRow[]> {
  const bySlug = new Map<string, CatalogRow>();

  merge(bySlug, await fetchSlice(db, input, { focus: true, mobility: false, limit: 220 }));
  if (bySlug.size < 40) {
    merge(bySlug, await fetchSlice(db, input, { focus: false, mobility: false, limit: 220 }));
  }
  merge(bySlug, await fetchSlice(db, input, { focus: false, mobility: true, limit: 60 }));

  const rows = [...bySlug.values()];
  rows.sort((a, b) => Number(hasDemo(b)) - Number(hasDemo(a)));
  const picked = rows.slice(0, PROMPT_CAP);
  if (picked.length < 12) {
    throw new HttpError(502, 'catalog_thin', 'Not enough matching exercises for those settings. Try a different focus or equipment.');
  }
  return picked;
}

export function catalogBySlug(rows: CatalogRow[]) {
  const slugs = new Map<string, CatalogRow>();
  const names = new Map<string, CatalogRow>();
  for (const row of rows) {
    slugs.set(row.slug, row);
    names.set(row.name.trim().toLowerCase(), row);
  }
  return { slugs, names };
}

export function formatCatalog(rows: CatalogRow[]) {
  return rows
    .map((r) => {
      const demo = hasDemo(r) ? 'demo' : 'no-demo';
      return `${r.slug} | ${r.name} | ${r.primary_equipment || ''} | ${r.body_region || ''} | ${r.target_muscle_group || ''} | ${r.movement_patterns || ''} | ${r.app_level || ''} | ${demo}`;
    })
    .join('\n');
}
