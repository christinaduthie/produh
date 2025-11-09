import axios from 'axios';
import { ENV } from '../config/env';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * List available Gemini models for your key (handy for debugging).
 */
export async function listGeminiModels() {
  const url = `${BASE}/models?key=${ENV.GEMINI.KEY}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data?.models ?? [];
}

/**
 * Call Gemini and parse a strict JSON response.
 * - Uses the correct field: response_mime_type
 * - Tries a few model fallbacks if a 404 NOT_FOUND occurs
 * - Throws a readable error with the last response payload
 */
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function geminiJSON(prompt: string, input: unknown) {
  const tryModels = [
    ENV.GEMINI.MODEL || 'gemini-1.5-pro-002',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { text: JSON.stringify(input) }],
      },
    ],
    generationConfig: {
      // NOTE: correct snake_case key:
      response_mime_type: 'application/json',
    },
  };

  let lastErr: any = null;

  for (const model of tryModels) {
    try {
      const data = await callModel(model, body);
      const part = data?.candidates?.[0]?.content?.parts?.[0];
      const text = part?.text ?? part?.inline_data?.data ?? '{}';
      return JSON.parse(text);
    } catch (err: any) {
      lastErr = err;

      // If it's a model-not-found on this API version, try the next fallback.
      const code = err?.response?.status;
      const msg = err?.response?.data?.error?.message ?? '';
      const notFound = code === 404 || /not found/i.test(msg);
      if (!notFound) break; // other errors (401/403/429/etc.) → stop early
    }
  }

  // Surface the best error we saw
  const status = lastErr?.response?.status || lastErr?.code || 'unknown';
  const payload = lastErr?.response?.data ? JSON.stringify(lastErr.response.data) : '';
  throw new Error(`Gemini error (${status}): ${payload}`);
}

async function callModel(model: string, body: unknown) {
  const url = `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${ENV.GEMINI.KEY}`;
  const maxAttempts = 3;
  let attempt = 0;
  let delay = 1000;

  while (attempt < maxAttempts) {
    try {
      const { data } = await axios.post(url, body, { timeout: 20000 });
      return data;
    } catch (err: any) {
      const status = err?.response?.status;
      const retryable = RETRYABLE_STATUS.has(Number(status));
      attempt += 1;
      if (retryable && attempt < maxAttempts) {
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }

  throw new Error('Reached max retries when calling Gemini');
}
