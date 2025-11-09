import { Router } from 'express';

const r = Router();

const HEALTH_METRICS = [
  { kpi: 'Weekly Active Teams', value: 54, target: 80, unit: 'teams' },
  { kpi: 'Incidents (7d)', value: 1, target: 0, unit: 'count' },
  { kpi: 'Cycle Time (days)', value: 3.2, target: 2.5, unit: 'days' },
  { kpi: 'Support Tickets', value: 7, target: 5, unit: 'tickets' }
];

const INCIDENTS = [
  { id: 'INC-102', type: 'Latency spike', owner: 'SRE', status: 'Monitoring' },
  { id: 'INC-099', type: 'Payment webhook retry', owner: 'Backend', status: 'Resolved' }
];

const BUGS = [
  { id: 'BUG-341', summary: 'Mobile upload stuck', severity: 'High', owner: 'Mobile' },
  { id: 'BUG-339', summary: 'Audit logs export mismatch', severity: 'Medium', owner: 'Platform' }
];

const COMPLAINTS = [
  { channel: 'Intercom', summary: 'Dashboard slow in EU', count: 3 },
  { channel: 'Canny', summary: 'Need CSV ingest alerting', count: 5 }
];

function buildTimeline() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((label, idx) => ({
    label,
    uptime: 99 - idx * 0.2 + Math.random() * 0.3,
    bugs: Math.round(Math.random() * 3),
    complaints: Math.round(Math.random() * 2)
  }));
}

r.post('/refresh', async (_req, res) => {
  res.json({
    metrics: HEALTH_METRICS,
    timeline: buildTimeline(),
    incidents: INCIDENTS,
    bugs: BUGS,
    complaints: COMPLAINTS,
    summary: {
      status: 'Monitoring',
      owner: 'Product Ops',
      updatedAt: new Date().toISOString()
    }
  });
});

export default r;
