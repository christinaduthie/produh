import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ENV } from './config/env.js';
import { log } from './config/logger.js';
import { ensureSchema } from './db/index.js';
import ai from './routes/ai';


import products from './routes/products.js';
import integrations from './routes/integrations.js';
import ingest from './routes/ingest.js';
import discover from './routes/discover.js';
import strategy from './routes/strategy.js';
import backlog from './routes/backlog.js';
import jiraEnh from './routes/jiraEnh.js';
import gtm from './routes/gtm.js';
import release from './routes/release.js';
import operate from './routes/operate.js';
import development from './routes/development.js';


const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));


app.get('/api/health', (_req,res)=> res.json({ ok:true }));
app.use('/api/products', products);
app.use('/api/integrations', integrations);
app.use('/api/ingest', ingest);
app.use('/api/discover', discover);
app.use('/api/strategy', strategy);
app.use('/api/backlog', backlog);
app.use('/api/jira', jiraEnh);
app.use('/api/gtm', gtm);
app.use('/api/release', release);
app.use('/api/operate', operate);
app.use('/api/development', development);
app.use('/api/ai', ai);


async function start() {
  await ensureSchema();
  app.listen(ENV.PORT, ()=> log.info(`server on :${ENV.PORT}`));
}

start().catch((err)=>{
  log.error({ err }, 'failed to start server');
  process.exit(1);
});
