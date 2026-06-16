import { config } from '../config';

// Provider-agnostic LLM client. Targets GreenNode Serverless AI's OpenAI-compatible
// endpoint, but works against ANY OpenAI-compatible API (so you can dev before the
// GreenNode key is confirmed — just point GREENNODE_BASE_URL/KEY anywhere).

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
export type CallOpts = {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  noThink?: boolean; // Qwen3 (vLLM): disable chain-of-thought → direct content, fast/cheap
};

function requireKey() {
  if (!config.GREENNODE_API_KEY) {
    throw new Error(
      'GREENNODE_API_KEY not set — add it, or point GREENNODE_BASE_URL/KEY at any OpenAI-compatible endpoint.',
    );
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry on 429 (rate limit) / 5xx with linear backoff — keeps the live demo robust under load.
async function fetchRetry(url: string, init: RequestInit, tries = 3): Promise<Response> {
  let res!: Response;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, init);
    if (res.status !== 429 && res.status < 500) return res;
    if (i < tries - 1) await sleep(400 * (i + 1));
  }
  return res;
}

export async function call(model: string, messages: Msg[], opts: CallOpts = {}): Promise<string> {
  requireKey();
  const res = await fetchRetry(`${config.GREENNODE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.GREENNODE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 1024,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      ...(opts.noThink ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM ${model} ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? '';
}

// Like call(), but parses a JSON object out of the reply (best-effort).
export async function callJSON<T = unknown>(model: string, messages: Msg[], opts: CallOpts = {}): Promise<T> {
  const text = await call(model, messages, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`Expected JSON from ${model}, got: ${text.slice(0, 300)}`);
  }
}

export async function embed(input: string | string[]): Promise<number[][]> {
  requireKey();
  const res = await fetchRetry(`${config.GREENNODE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.GREENNODE_API_KEY}`,
    },
    body: JSON.stringify({ model: config.MODEL_EMBED, input }),
  });
  if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text().catch(() => '')}`);
  const data = (await res.json()) as any;
  return data.data.map((d: any) => d.embedding as number[]);
}
