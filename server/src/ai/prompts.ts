export const ProblemBriefPrompt = `You are a senior PM. Given cross-tool signals, output a Problem Brief as strict JSON:
{
"summary": string, // <=120 words
"pains": [{"text": string, "evidence": [{"signalId": string, "quote": string, "link": string}]}],
"personas": string[],
"kpiCandidates": [{"name": string, "type": "leading"|"lagging", "definition": string, "unit": string}],
"mermaid": string
}`;


export const StrategyGeneratePrompt = `You are a staff PM. From the Problem Brief, propose a feasible solution plus measurable KPIs and time-bound goals. Output JSON:
{
"solution": {"overview": string, "keyFlows": string[], "risks": string[], "dependencies": string[]},
"kpis": [{"name": string, "slug": string, "type": "leading"|"lagging", "definition": string, "unit": string, "baseline"?: number, "target"?: number, "timeframe"?: string, "instrumentation": {"eventSpec": string[], "source": string, "owner": string}}],
"goals": [{"statement": string, "deadline"?: string, "linkedKpi"?: string}]
}`;


export const StrategyEvaluatePrompt = `Score the proposed solution with this rubric (0-5 each): strategicFit(1.0), customerValue(1.2), feasibility(1.0), timeToValue(1.1), financialImpact(1.1), compliance(1.0), kpiMeasurability(1.0). If fail, give targeted revision suggestions. Output JSON:
{
"weightedScore": number,
"scores": {"strategicFit": number, "customerValue": number, "feasibility": number, "timeToValue": number, "financialImpact": number, "compliance": number, "kpiMeasurability": number},
"pass": boolean,
"reasons": string[],
"revise": string[]
}`;


export const BacklogPrompt = `Create Epic->Features->Stories->Subtasks for the approved solution. Use concise titles, testable Gherkin ACs, and dependency hints. Output JSON:
{
"epic": {"title": string, "description": string},
"features": [{"title": string, "description": string}],
"stories": [{"title": string, "description": string, "acceptanceCriteria": string[], "tags": string[], "subtasks": [{"title": string, "description": string}]}],
"links": [{"from": string, "to": string, "type": "blocks"|"relates"}]
}`;


export const WeeklyDigestPrompt = `Summarize KPI movement vs target, incidents, cycle time deltas. Propose top 3 next bets with RICE. Output JSON:
{
"summary": string,
"topRisks": string[],
"nextBets": [{"title": string, "why": string, "RICE": {"reach": number, "impact": number, "confidence": number, "effort": number}}]
}`;