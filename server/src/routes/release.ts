import { Router } from 'express';
import { teamsPostMessage } from '../integrations/msgraph.js';
import { ENV } from '../config/env.js';
import { q, SQL } from '../db/index.js';

const r = Router();

type ShippingItem = {
  title: string;
  owner: string;
  eta: string;
  status: string;
  jiraKey: string;
  summary: string;
};

type ReadinessItem = {
  label: string;
  status: 'Ready' | 'Pending' | 'Blocked';
  owner?: string;
  notes?: string;
};

type ReleaseDashboard = {
  product?: any;
  shipping: ShippingItem[];
  readiness: {
    status: 'Ready to ship' | 'Blocked';
    checklist: ReadinessItem[];
    blocking?: string[];
    gateId: string;
    updatedAt: string;
  };
  comms: {
    exec: string;
    eng: string;
    support: string;
    channelLink: string;
    emailSubject: string;
    emailBody: string;
  };
  traceability: Array<{ label: string; link: string; type: string }>;
  safety: {
    rollbackOwner: string;
    steps: string[];
    incidents: string[];
    owner: string;
    notes?: string;
  };
  channel: {
    name: string;
    link: string;
  };
};

type ReleaseContext = {
  product?: any;
  plan: any;
  backlog: any;
  planKeys: Record<string, string>;
  shipping: ShippingItem[];
  slug: string;
  channel: { name: string; link: string };
};

r.get('/dashboard', async (req, res) => {
  const { productId } = req.query as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const ctx = await buildReleaseContext(productId);
  const dashboard = buildReleaseDashboard(ctx);
  res.json(dashboard);
});

r.post('/gate', async (req, res) => {
  const { productId } = req.body as { productId?: string };
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const ctx = await buildReleaseContext(productId);
  const readiness = buildReadiness(ctx.shipping, ctx.plan?.qaChecklist || []);
  res.json(readiness);
});

r.post('/create-channel', async (req, res) => {
  const { productId } = req.body as { productId?: string };
  const ctx = productId ? await buildReleaseContext(productId) : null;
  const safety = ctx ? buildSafety(ctx) : null;
  const message =
    ctx && ctx.shipping.length
      ? `Release kickoff for ${ctx.product?.name || ctx.slug.toUpperCase()} — ${ctx.shipping
          .map((s) => `${s.jiraKey}: ${s.title}`)
          .slice(0, 3)
          .join(', ')}. Rollback owner: ${safety?.rollbackOwner || 'Eng Lead'}.`
      : 'Release kickoff posted by ProDuh!';

  if (!hasTeamsCreds()) {
    return res.json({
      posted: false,
      simulated: true,
      message,
      channel: ctx?.channel
    });
  }

  try {
    const msg = await teamsPostMessage(ENV.MS.TEAM_ID, ENV.MS.CHANNEL_ID, message);
    return res.json({ posted: !!msg?.id, message, channel: ctx?.channel });
  } catch (err) {
    return res.status(502).json({ posted: false, error: 'Failed to post kickoff', message });
  }
});

export default r;

async function buildReleaseContext(productId: string): Promise<ReleaseContext> {
  const productRow = (await q('SELECT * FROM product WHERE id=$1', [productId])).rows[0];
  const backlogRow = (await q(SQL.BACKLOG_SELECT_LATEST, [productId])).rows[0];
  const planRow = (await q(SQL.DEV_PLAN_SELECT_LATEST, [productId])).rows[0];

  const owners = parseJson(productRow?.owners, []);
  const slug = slugify(productRow?.code || productRow?.name || 'release');
  const plan = planRow ? parseJson(planRow.plan_json, {}) : {};
  const planKeys = planRow ? parseJson(planRow.jira_keys, {}) : {};
  const backlog = backlogRow ? parseJson(backlogRow.json, {}) : {};
  const shipping = buildShipping(plan, backlog, owners, planKeys, slug);
  const channel = {
    name: `#${slug}-launch`,
    link: `https://teams.microsoft.com/l/channel/${slug}/launch`
  };

  return {
    product: productRow ? { ...productRow, owners } : undefined,
    plan,
    backlog,
    planKeys,
    shipping,
    slug,
    channel
  };
}

function buildReleaseDashboard(ctx: Awaited<ReturnType<typeof buildReleaseContext>>): ReleaseDashboard {
  const readiness = buildReadiness(ctx.shipping, ctx.plan?.qaChecklist || []);
  const traceability = buildTraceability(ctx);
  const safety = buildSafety(ctx);
  const comms = buildComms(ctx, traceability, safety);
  return {
    product: ctx.product,
    shipping: ctx.shipping,
    readiness,
    comms,
    traceability,
    safety,
    channel: ctx.channel
  };
}

function buildShipping(
  plan: any,
  backlog: any,
  owners: Array<{ name?: string }>,
  planKeys: Record<string, string>,
  slug: string
): ShippingItem[] {
  const stories = Array.isArray(plan?.stories) && plan.stories.length ? plan.stories : backlog?.stories || [];
  const ownerNames = owners?.length ? owners.map((o) => o?.name).filter(Boolean) : ['PM Lead', 'Eng Lead', 'QA Lead'];
  return stories.slice(0, 5).map((story: any, idx: number) => {
    const eta = new Date(Date.now() + (idx + 2) * 86400000).toISOString();
    const statusCycle = ['Ready', 'Ready', 'QA', 'Docs', 'Pending QA'];
    const status = statusCycle[idx % statusCycle.length];
    const jiraKey = planKeys[`story_${idx}`] || `${slug.toUpperCase()}-${idx + 1}`;
    const owner = ownerNames[idx % ownerNames.length] || 'Unassigned';
    return {
      title: story?.title || `Story ${idx + 1}`,
      owner,
      eta,
      status,
      jiraKey,
      summary: story?.description || 'Summary coming soon'
    };
  });
}

function buildReadiness(shipping: ShippingItem[], qaChecklist: string[]) {
  const checklist: ReadinessItem[] = [
    {
      label: 'QA sign-off',
      owner: 'QA Lead',
      status: qaChecklist.length ? 'Ready' : 'Pending',
      notes: qaChecklist.slice(0, 3).join(', ') || 'Checklist in progress'
    },
    {
      label: 'Docs + Release Notes',
      owner: 'Product Marketing',
      status: shipping.some((s) => s.status === 'Docs') ? 'Pending' : 'Ready'
    },
    {
      label: 'Go / No-Go',
      owner: 'Release Manager',
      status: shipping.every((s) => s.status === 'Ready') ? 'Ready' : 'Pending'
    },
    {
      label: 'Rollback rehearsal',
      owner: 'Eng Lead',
      status: 'Ready',
      notes: 'Blue/green ready in staging'
    }
  ];
  const blocking = checklist.filter((c) => c.status !== 'Ready').map((c) => c.label);
  const status: 'Ready to ship' | 'Blocked' = blocking.length === 0 ? 'Ready to ship' : 'Blocked';
  return {
    status,
    checklist,
    blocking,
    gateId: `gate-${Date.now()}`,
    updatedAt: new Date().toISOString()
  };
}

function buildComms(
  ctx: Awaited<ReturnType<typeof buildReleaseContext>>,
  traceability: ReleaseDashboard['traceability'],
  safety: ReleaseDashboard['safety']
) {
  const shippingSummary = ctx.shipping
    .map((item) => `${item.jiraKey}: ${item.title} (${formatDate(item.eta)})`)
    .join('\n- ');
  const releaseNotesLink = traceability.find((t) => t.type === 'Release Notes')?.link || 'https://confluence.local/release-notes';
  const jiraLink = traceability.find((t) => t.type === 'Jira Board')?.link || 'https://jira.local/board';
  return {
    exec: `Exec update:\n- ${shippingSummary}\nGate: ${ctx.channel.name}\nRelease notes: ${releaseNotesLink}`,
    eng: `Eng broadcast:\nShip list:\n- ${shippingSummary}\nRegression window closes ${formatDate(
      ctx.shipping[0]?.eta
    )}\nBoard: ${jiraLink}`,
    support: `Support prep:\nWe are shipping ${ctx.shipping.length} stories. Rollback owner: ${
      safety.rollbackOwner
    }.\nRelease notes: ${releaseNotesLink}`,
    channelLink: ctx.channel.link,
    emailSubject: `${ctx.product?.code || ctx.slug.toUpperCase()} release update`,
    emailBody: [
      `Team,`,
      ``,
      `We're targeting ${formatDate(ctx.shipping[0]?.eta)} for ${ctx.product?.name || ctx.slug.toUpperCase()}.`,
      `Key stories:`,
      ...ctx.shipping.map((item) => `• ${item.jiraKey} — ${item.title} (${item.status})`),
      ``,
      `Rollback owner: ${safety.rollbackOwner}`,
      `More: ${releaseNotesLink}`
    ].join('\n')
  };
}

function buildTraceability(ctx: Awaited<ReturnType<typeof buildReleaseContext>>) {
  const slug = ctx.slug;
  const releaseNotes = `https://confluence.local/${slug}/release-notes`;
  const changeLog = `https://confluence.local/${slug}/change-log`;
  const jiraBoard = `https://jira.local/browse/${ctx.planKeys.story_0 || slug.toUpperCase()}`;
  return [
    { label: 'Release Notes', link: releaseNotes, type: 'Release Notes' },
    { label: 'Change Log', link: changeLog, type: 'Change Log' },
    { label: 'Teams Channel', link: ctx.channel.link, type: 'Teams' },
    { label: 'Jira Board', link: jiraBoard, type: 'Jira Board' }
  ];
}

function buildSafety(ctx: Awaited<ReturnType<typeof buildReleaseContext>>) {
  const owners = ctx.product?.owners || [];
  const rollbackOwner = owners[0]?.name || 'Eng Lead';
  return {
    rollbackOwner,
    owner: rollbackOwner,
    steps: [
      'Keep prior build warm in us-east-1',
      'Notify on-call before rollback',
      'Update release notes + change log post rollback'
    ],
    incidents: ['Incident feed syncs back into Operate KPIs for MTTR dashboards']
  };
}

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'release';
}

function formatDate(value?: string) {
  if (!value) return 'TBD';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function hasTeamsCreds() {
  return Boolean(ENV.MS?.TEAM_ID && ENV.MS?.CHANNEL_ID && ENV.MS?.CLIENT_ID);
}
