import { NextRequest, NextResponse } from 'next/server';
import { AIAnalysisRequest, AIAnalysisResult } from '@/lib/ai/types';
import { STRATEGIES, buildAnalysisPrompt } from '@/lib/ai/strategies';

export async function POST(req: NextRequest) {
  try {
    const body: AIAnalysisRequest = await req.json();

    if (!body.claudeApiKey || !body.symbol || !body.strategy || !body.signal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const strategy = STRATEGIES[body.strategy];
    if (!strategy) {
      return NextResponse.json({ error: 'Unknown strategy' }, { status: 400 });
    }

    const userPrompt = buildAnalysisPrompt(strategy, body.signal);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': body.claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.claudeModel || 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: strategy.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Claude API error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    // Parse JSON from Claude response
    let parsed: Partial<AIAnalysisResult>;
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        action: 'WAIT',
        confidence: 0,
        entryPrice: null,
        tp: null,
        sl: null,
        reasoning: `Failed to parse Claude response: ${text.slice(0, 200)}`,
        riskReward: null,
        timestamp: Date.now(),
        symbol: body.symbol,
        strategy: body.strategy,
      } satisfies AIAnalysisResult);
    }

    const result: AIAnalysisResult = {
      action: parsed.action === 'BUY' || parsed.action === 'SELL' ? parsed.action : 'WAIT',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
      entryPrice: parsed.entryPrice ?? null,
      tp: parsed.tp ?? null,
      sl: parsed.sl ?? null,
      reasoning: parsed.reasoning ?? '',
      riskReward: parsed.riskReward ?? null,
      timestamp: Date.now(),
      symbol: body.symbol,
      strategy: body.strategy,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
