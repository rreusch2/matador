import { readFileSync } from 'node:fs';

import { PLAN_JSON_SCHEMA, sanitizePlan } from './src/modules/workouts/workouts.schema.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './src/modules/workouts/workouts.prompt.js';

const key = readFileSync('../.env', 'utf8').match(/^XAI_API_KEY=(.+)$/m)?.[1].trim();
if (!key) throw new Error('no key');

const CASES = {
  gym: {
    goal: 'muscle',
    focus: 'upper',
    minutes: 45,
    equipment: 'gym',
    level: 'intermediate',
    notes: '',
    avoid: [],
  },
  tricky: {
    goal: 'fat',
    focus: 'full',
    minutes: 15,
    equipment: 'bodyweight',
    level: 'beginner',
    notes: 'bad left knee, no jumping please',
    avoid: [],
  },
  mobility: {
    goal: 'mobility',
    focus: 'lower',
    minutes: 30,
    equipment: 'bands',
    level: 'advanced',
    notes: '',
    avoid: [],
  },
} as const;

async function run(model: string, effort: string | null, caseName: keyof typeof CASES, dump = false) {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(CASES[caseName] as never) },
    ],
    response_format: { type: 'json_schema', json_schema: { ...PLAN_JSON_SCHEMA, strict: true } },
    max_tokens: 3000,
  };
  if (effort) body.reasoning_effort = effort;

  const t = Date.now();
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const ms = Date.now() - t;
  if (!res.ok) {
    console.log(`${model} effort=${effort} ${caseName} -> HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    return;
  }
  const json = (await res.json()) as any;
  const content = json.choices?.[0]?.message?.content ?? '';
  let plan: ReturnType<typeof sanitizePlan> = null;
  try {
    plan = sanitizePlan(JSON.parse(content), { slugs: new Map(), names: new Map() });
  } catch {}
  const u = json.usage ?? {};
  console.log(
    `${model.padEnd(30)} ${caseName.padEnd(9)} ${String(ms).padStart(6)}ms ` +
      `reasoning=${String(u.completion_tokens_details?.reasoning_tokens ?? 0).padStart(4)} ` +
      `valid=${plan ? 'yes' : 'NO '} warm=${plan?.warmup.length} main=${plan?.main.length} ` +
      `fin=${plan?.finisher.length} cool=${plan?.cooldown.length} "${plan?.title}"`
  );
  if (dump && plan) {
    console.log(`   summary: ${plan.summary}`);
    console.log(`   coach:   ${plan.coachNote}`);
    for (const m of plan.main) console.log(`   - ${m.name} | ${m.sets} x ${m.reps} | rest ${m.rest} | ${m.cue}`);
    console.log('');
  }
}

const mode = process.argv[2] ?? 'speed';

if (mode === 'speed') {
  for (let i = 0; i < 2; i++) {
    await run('grok-4.20-0309-non-reasoning', null, 'gym');
    await run('grok-4.3', 'low', 'gym');
  }
} else {
  for (const c of ['tricky', 'mobility'] as const) {
    await run('grok-4.20-0309-non-reasoning', null, c, true);
    await run('grok-4.3', 'low', c, true);
  }
}
