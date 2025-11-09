import { Router } from 'express';
import { listGeminiModels } from '../ai/gemini';

const r = Router();

r.get('/models', async (_req, res) => {
  try {
    const models = await listGeminiModels();
    res.json({ models: models.map((m: any) => ({ name: m.name, supportedMethods: m.supportedGenerationMethods })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to list models' });
  }
});

export default r;
