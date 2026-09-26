import { env } from '../config/env.js';
import { HttpError } from './errors.js';
import { logger } from './logger.js';

const URL = 'https://api.x.ai/v1/chat/completions';

/** These models reject reasoning_effort outright. */
const NON_REASONING = /non-reasoning/i;

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

type JsonRequest = {
  system: string;
  user: string;
  /** JSON Schema for structured output (strict mode). */
  schema: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
};

type JsonResult = { data: unknown; model: string; latencyMs: number; tokens: number | null };

const busy = () => new HttpError(503, 'ai_busy', 'Lots of athletes training right now. Try again in a moment.');
const failed = () => new HttpError(502, 'ai_failed', 'Could not build your workout right now. Please try again.');

/** Calls Grok and returns the parsed JSON body that matches `schema`. */
export async function grokJson(req: JsonRequest, withEffort = true): Promise<JsonResult> {
  const messages: Message[] = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ];
  const body: Record<string, unknown> = {
    model: env.XAI_MODEL,
    messages,
    response_format: { type: 'json_schema', json_schema: { ...req.schema, strict: true } },
    max_tokens: req.maxTokens ?? 3000,
  };
  if (withEffort && env.XAI_REASONING_EFFORT && !NON_REASONING.test(env.XAI_MODEL)) {
    body.reasoning_effort = env.XAI_REASONING_EFFORT;
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.XAI_API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.XAI_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    logger.warn({ err }, timedOut ? 'xAI timeout' : 'xAI network error');
    throw new HttpError(504, 'ai_timeout', 'The coach is taking too long. Please try again.');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ status: res.status, body: text.slice(0, 600) }, 'xAI request failed');
    // Some models reject reasoning_effort; retry once without it.
    if (res.status === 400 && withEffort && /reasoning/i.test(text)) return grokJson(req, false);
    if (res.status === 429) throw busy();
    if (res.status === 401 || res.status === 403) throw new HttpError(500, 'ai_config', 'Workout builder is not configured correctly.');
    throw failed();
  }

  const json = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw failed();

  try {
    return {
      data: JSON.parse(content),
      model: json.model ?? env.XAI_MODEL,
      latencyMs: Date.now() - started,
      tokens: json.usage?.total_tokens ?? null,
    };
  } catch {
    logger.error({ content: content.slice(0, 300) }, 'xAI returned invalid JSON');
    throw failed();
  }
}
