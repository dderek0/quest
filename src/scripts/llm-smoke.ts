import { config } from '../config';
import { call } from '../llm/client';
import { MODELS } from '../llm/models';

const mask = (s?: string) => (!s ? '(unset)' : s.length <= 8 ? '***' : `${s.slice(0, 4)}…${s.slice(-2)}`);

(async () => {
  console.log('GREENNODE_BASE_URL =', config.GREENNODE_BASE_URL);
  console.log('GREENNODE_API_KEY  =', mask(config.GREENNODE_API_KEY));
  console.log('models             =', MODELS);
  console.log();

  // 1) GET /models — validates endpoint + key, and reveals the REAL model ids
  console.log('— GET /models —');
  try {
    const res = await fetch(`${config.GREENNODE_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${config.GREENNODE_API_KEY}` },
    });
    const text = await res.text();
    console.log('HTTP', res.status);
    try {
      const j: any = JSON.parse(text);
      const ids = (j.data || j.models || []).map((m: any) => m.id || m.name);
      console.log('available models:', ids.length ? ids : j);
    } catch {
      console.log(text.slice(0, 600));
    }
  } catch (e) {
    console.log('ERR', e instanceof Error ? e.message : e);
  }
  console.log();

  // 2) tiny chat completion with the tutor model
  console.log('— chat completion (tutor =', MODELS.tutor, ') —');
  try {
    const out = await call(MODELS.tutor, [{ role: 'user', content: 'Trả lời đúng một từ: pong' }], {
      maxTokens: 16,
      temperature: 0,
    });
    console.log('reply:', JSON.stringify(out));
  } catch (e) {
    console.log('ERR', e instanceof Error ? e.message : e);
  }
})();
