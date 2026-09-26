import { supabase } from '@/lib/supabase';

export type LibraryExercise = {
  slug: string;
  name: string;
  demo: string | null;
  explanation: string | null;
  difficulty: string | null;
  level: string | null;
  target: string | null;
  primeMover: string | null;
  secondary: string[];
  equipment: string | null;
  secondaryEquipment: string | null;
  pattern: string | null;
  mechanics: string | null;
  classification: string | null;
  region: string | null;
  videoId: string | null;
  guideId: string | null;
};

const COLUMNS =
  'slug, name, demo, explanation, difficulty, app_level, target_muscle_group, prime_mover_muscle, secondary_muscles, primary_equipment, secondary_equipment, movement_patterns, mechanics, classification, body_region';

/**
 * The plain version of the moves people look up first. Each slug is the basic
 * entry in the catalog, and every one has a demo.
 */
export const POPULAR_SLUGS = [
  'barbell-bench-press',
  'bodyweight-push-up',
  'barbell-high-bar-back-squat',
  'barbell-conventional-deadlift',
  'bar-pull-up',
  'barbell-bent-over-row',
  'barbell-overhead-press',
  'barbell-romanian-deadlift',
  'bodyweight-forward-lunge',
  'bodyweight-forearm-plank',
  'double-dumbbell-bicep-curl',
  'bodyweight-dips',
];

type Row = {
  slug: string;
  name: string;
  demo: string | null;
  explanation: string | null;
  difficulty: string | null;
  app_level: string | null;
  target_muscle_group: string | null;
  prime_mover_muscle: string | null;
  secondary_muscles: string | null;
  primary_equipment: string | null;
  secondary_equipment: string | null;
  movement_patterns: string | null;
  mechanics: string | null;
  classification: string | null;
  body_region: string | null;
};

/** Pulls the 11-character video id out of youtu.be, watch, embed, and shorts links. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function splitList(value: string | null) {
  return (value ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

function toExercise(row: Row): LibraryExercise {
  const videoId = youtubeId(row.demo);
  const guideId = youtubeId(row.explanation);
  return {
    slug: row.slug,
    name: row.name.trim(),
    demo: row.demo,
    explanation: row.explanation,
    difficulty: row.difficulty,
    level: row.app_level,
    target: row.target_muscle_group,
    primeMover: row.prime_mover_muscle,
    secondary: splitList(row.secondary_muscles),
    equipment: row.primary_equipment,
    secondaryEquipment: row.secondary_equipment,
    pattern: splitList(row.movement_patterns)[0] ?? null,
    mechanics: row.mechanics,
    classification: row.classification,
    region: row.body_region,
    videoId,
    guideId: guideId && guideId !== videoId ? guideId : null,
  };
}

export async function listPopular(): Promise<LibraryExercise[]> {
  const { data, error } = await supabase.from('exercises').select(COLUMNS).in('slug', POPULAR_SLUGS);
  if (error) throw error;
  const bySlug = new Map(((data ?? []) as Row[]).map((row) => [row.slug, toExercise(row)]));
  return POPULAR_SLUGS.flatMap((slug) => {
    const exercise = bySlug.get(slug);
    return exercise ? [exercise] : [];
  });
}

export async function searchExercises(query: string): Promise<LibraryExercise[]> {
  const term = query.trim().replace(/[%_\\]/g, '');
  if (term.length < 2) return [];
  const { data, error } = await supabase.from('exercises').select(COLUMNS).ilike('name', `%${term}%`).limit(400);
  if (error) throw error;
  const needle = term.toLowerCase();
  return ((data ?? []) as Row[])
    .map(toExercise)
    .sort((a, b) => rankName(a.name, needle) - rankName(b.name, needle) || a.name.localeCompare(b.name))
    .slice(0, 24);
}

function rankName(name: string, term: string) {
  const words = name.toLowerCase().split(/[^a-z0-9]+/);
  const bucket = words[0]?.startsWith(term) ? 0 : words.some((word) => word.startsWith(term)) ? 1 : 2;
  return bucket * 1000 + name.length;
}

export async function getExercise(slug: string): Promise<LibraryExercise | null> {
  const { data, error } = await supabase.from('exercises').select(COLUMNS).eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? toExercise(data as Row) : null;
}
