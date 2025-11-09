import { Pool } from 'pg';
import { ENV } from '../config/env';

type ProductRow = {
  id: string;
  name: string;
  code: string;
  owners: any[];
  stage: string;
  approval: string;
  health: string;
  next_milestone: string | null;
  last_change_at: string;
};

type SignalRow = {
  id: string;
  product_id: string;
  source: string;
  author: string;
  ts: string;
  text: string;
  link: string;
  tags: any[];
};

type BriefRow = {
  id: string;
  product_id: string;
  summary: string;
  pains: any[];
  personas: any[];
  kpi_candidates: any[];
  mermaid: string;
  evidence: any[];
  confluence_page_id: string | null;
  created_at: string;
};

type SolutionRow = {
  id: string;
  product_id: string;
  spec: any;
  risks: any[];
  dependencies: any[];
  kpis: any[];
  goals: any[];
  gate_scores: any;
  passed: boolean;
  confluence_page_id: string | null;
  created_at: string;
};

type BacklogRow = {
  id: string;
  product_id: string;
  json: any;
  jira_keys?: any;
  created_at: string;
};

const mockTables: {
  products: ProductRow[];
  signals: SignalRow[];
  briefs: BriefRow[];
  solutions: SolutionRow[];
  backlogs: BacklogRow[];
} = {
  products: [],
  signals: [],
  briefs: [],
  solutions: [],
  backlogs: []
};

const nowIso = () => new Date().toISOString();

if (ENV.MOCK_MODE && mockTables.products.length === 0) {
  mockTables.products.push({
    id: 'demo-product',
    name: 'ProDuh Product Alpha',
    code: 'ALPHA',
    owners: [{ name: 'Demo PM', email: 'pm@example.com' }],
    stage: 'Discovery',
    approval: 'Pending',
    health: 'Amber',
    next_milestone: 'Problem Brief v1',
    last_change_at: nowIso()
  });
}

const pool = ENV.MOCK_MODE ? undefined : new Pool({ connectionString: ENV.DB_URL });
export const db = pool;

export const SQL = {
  PRODUCT_SELECT_ALL: 'SELECT * FROM product ORDER BY last_change_at DESC',
  PRODUCT_INSERT: 'INSERT INTO product (id,name,code,owners) VALUES ($1,$2,$3,$4)',
  SIGNAL_INSERT:
    'INSERT INTO signal (id, product_id, source, author, ts, text, link, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING',
  SIGNAL_SELECT_FOR_PRODUCT: 'SELECT * FROM signal WHERE product_id=$1 ORDER BY ts DESC',
  BRIEF_INSERT:
    'INSERT INTO brief (id, product_id, summary, pains, personas, kpi_candidates, mermaid, evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
  BRIEF_SELECT_LATEST: 'SELECT * FROM brief WHERE product_id=$1 ORDER BY created_at DESC LIMIT 1',
  BRIEF_UPDATE_CONFLUENCE: 'UPDATE brief SET confluence_page_id=$1 WHERE id=$2',
  SOLUTION_INSERT:
    'INSERT INTO solution (id, product_id, spec, risks, dependencies, kpis, goals, gate_scores, passed) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
  SOLUTION_SELECT_LATEST: 'SELECT * FROM solution WHERE product_id=$1 ORDER BY created_at DESC LIMIT 1',
  SOLUTION_UPDATE_CONFLUENCE: 'UPDATE solution SET confluence_page_id=$1 WHERE id=$2',
  BACKLOG_INSERT: 'INSERT INTO backlog (id, product_id, json) VALUES ($1,$2,$3)',
  BACKLOG_SELECT_LATEST: 'SELECT * FROM backlog WHERE product_id=$1 ORDER BY created_at DESC LIMIT 1',
  BACKLOG_UPDATE_KEYS: 'UPDATE backlog SET jira_keys=$1 WHERE id=$2'
} as const;

const SCHEMA_TABLES = [
  `CREATE TABLE IF NOT EXISTS product (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    owners JSONB DEFAULT '[]'::jsonb,
    stage TEXT CHECK (stage IN ('Discovery','Strategy','Backlog','GTM','Release','Operate')) DEFAULT 'Discovery',
    approval TEXT CHECK (approval IN ('Approved','Pending','Rejected')) DEFAULT 'Pending',
    health TEXT CHECK (health IN ('Green','Amber','Red')) DEFAULT 'Amber',
    next_milestone TEXT,
    last_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS integration (
    id TEXT PRIMARY KEY,
    type TEXT,
    config JSONB,
    encrypted_token TEXT,
    scopes JSONB,
    status TEXT,
    last_tested_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS signal (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    source TEXT,
    author TEXT,
    ts TIMESTAMP,
    text TEXT,
    link TEXT,
    tags JSONB
  )`,
  `CREATE TABLE IF NOT EXISTS artifact (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    kind TEXT,
    title TEXT,
    link TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS brief (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    summary TEXT,
    pains JSONB DEFAULT '[]'::jsonb,
    personas JSONB DEFAULT '[]'::jsonb,
    kpi_candidates JSONB DEFAULT '[]'::jsonb,
    mermaid TEXT,
    evidence JSONB DEFAULT '[]'::jsonb,
    confluence_page_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS solution (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    spec JSONB DEFAULT '{}'::jsonb,
    risks JSONB DEFAULT '[]'::jsonb,
    dependencies JSONB DEFAULT '[]'::jsonb,
    kpis JSONB DEFAULT '[]'::jsonb,
    goals JSONB DEFAULT '[]'::jsonb,
    gate_scores JSONB DEFAULT '{}'::jsonb,
    passed BOOLEAN,
    confluence_page_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS backlog (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    json JSONB DEFAULT '{}'::jsonb,
    jira_keys JSONB,
    mirror_confluence_page_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS health_snapshot (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    date DATE,
    kpi_values JSONB,
    incidents_count INT,
    error_rate FLOAT,
    cycle_time FLOAT,
    notes TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS run_log (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES product(id),
    action TEXT,
    input JSONB,
    output JSONB,
    status TEXT,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

const SCHEMA_PATCHES = [
  `ALTER TABLE brief ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE solution ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE backlog ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE artifact ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `ALTER TABLE product ALTER COLUMN owners SET DEFAULT '[]'::jsonb`
];

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (ENV.MOCK_MODE) return Promise.resolve();
  if (!schemaReady) {
    if (!pool) throw new Error('Database pool not initialized');
    schemaReady = (async () => {
      for (const sql of SCHEMA_TABLES) {
        await pool.query(sql);
      }
      for (const sql of SCHEMA_PATCHES) {
        await pool.query(sql);
      }
    })();
  }
  return schemaReady;
}

export async function q<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
  if (!ENV.MOCK_MODE) {
    if (!pool) throw new Error('Database pool not initialized');
    return pool.query(sql, params);
  }

  const rows = handleMockQuery(sql.trim(), params);
  return { rows: rows as T[] };
}

function handleMockQuery(sql: string, params: any[]): any[] {
  switch (sql) {
    case SQL.PRODUCT_SELECT_ALL:
      return [...mockTables.products]
        .sort((a, b) => new Date(b.last_change_at).getTime() - new Date(a.last_change_at).getTime())
        .map(clone);
    case SQL.PRODUCT_INSERT:
      mockTables.products.push({
        id: params[0],
        name: params[1],
        code: params[2],
        owners: parseJson(params[3], []),
        stage: 'Discovery',
        approval: 'Pending',
        health: 'Amber',
        next_milestone: null,
        last_change_at: nowIso()
      });
      return [];
    case SQL.SIGNAL_INSERT: {
      const id = params[0];
      if (!mockTables.signals.find((s) => s.id === id)) {
        mockTables.signals.push({
          id,
          product_id: params[1],
          source: params[2],
          author: params[3],
          ts: params[4],
          text: params[5],
          link: params[6],
          tags: parseJson(params[7], [])
        });
      }
      return [];
    }
    case SQL.SIGNAL_SELECT_FOR_PRODUCT:
      return mockTables.signals
        .filter((s) => s.product_id === params[0])
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .map(clone);
    case SQL.BRIEF_INSERT:
      mockTables.briefs.push({
        id: params[0],
        product_id: params[1],
        summary: params[2],
        pains: parseJson(params[3], []),
        personas: parseJson(params[4], []),
        kpi_candidates: parseJson(params[5], []),
        mermaid: params[6],
        evidence: parseJson(params[7], []),
        confluence_page_id: null,
        created_at: nowIso()
      });
      touchProduct(params[1]);
      return [];
    case SQL.BRIEF_SELECT_LATEST: {
      const entry = latestForProduct(mockTables.briefs, params[0]);
      return entry ? [clone(entry)] : [];
    }
    case SQL.BRIEF_UPDATE_CONFLUENCE: {
      const row = mockTables.briefs.find((b) => b.id === params[1]);
      if (row) row.confluence_page_id = params[0];
      return [];
    }
    case SQL.SOLUTION_INSERT:
      mockTables.solutions.push({
        id: params[0],
        product_id: params[1],
        spec: parseJson(params[2], {}),
        risks: parseJson(params[3], []),
        dependencies: parseJson(params[4], []),
        kpis: parseJson(params[5], []),
        goals: parseJson(params[6], []),
        gate_scores: parseJson(params[7], {}),
        passed: !!params[8],
        confluence_page_id: null,
        created_at: nowIso()
      });
      touchProduct(params[1]);
      return [];
    case SQL.SOLUTION_SELECT_LATEST: {
      const entry = latestForProduct(mockTables.solutions, params[0]);
      return entry ? [clone(entry)] : [];
    }
    case SQL.SOLUTION_UPDATE_CONFLUENCE: {
      const row = mockTables.solutions.find((s) => s.id === params[1]);
      if (row) row.confluence_page_id = params[0];
      return [];
    }
    case SQL.BACKLOG_INSERT:
      mockTables.backlogs.push({
        id: params[0],
        product_id: params[1],
        json: parseJson(params[2], {}),
        created_at: nowIso()
      });
      touchProduct(params[1]);
      return [];
    case SQL.BACKLOG_SELECT_LATEST: {
      const entry = latestForProduct(mockTables.backlogs, params[0]);
      return entry ? [clone(entry)] : [];
    }
    case SQL.BACKLOG_UPDATE_KEYS: {
      const row = mockTables.backlogs.find((b) => b.id === params[1]);
      if (row) row.jira_keys = parseJson(params[0], {});
      return [];
    }
    default:
      throw new Error(`Mock query not implemented: ${sql}`);
  }
}

function parseJson<T>(value: any, fallback: T): T {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function clone<T>(row: T): T {
  return JSON.parse(JSON.stringify(row));
}

function latestForProduct<T extends { product_id: string }>(rows: T[], productId: string): T | undefined {
  const matches = rows.filter((r) => r.product_id === productId);
  if (!matches.length) return undefined;
  return matches[matches.length - 1];
}

function touchProduct(productId: string) {
  const row = mockTables.products.find((p) => p.id === productId);
  if (row) row.last_change_at = nowIso();
}
