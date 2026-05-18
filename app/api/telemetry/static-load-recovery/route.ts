import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function safeJsonParse(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { raw: text };
  }
}

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = (await request.json()) as unknown;
      return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  try {
    const raw = await request.text();
    return safeJsonParse(raw);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);

  const reason = typeof payload.reason === 'string' ? payload.reason : 'unknown';
  const blockedInRetryWindow = Boolean(payload.blockedInRetryWindow);
  const totalCount = Number.isFinite(payload.totalCount) ? Number(payload.totalCount) : 0;
  const windowCount = Number.isFinite(payload.windowCount) ? Number(payload.windowCount) : 0;
  const path = typeof payload.path === 'string' ? payload.path : '';
  const deploymentId = typeof payload.deploymentId === 'string' ? payload.deploymentId : '';
  const userAgent = typeof payload.userAgent === 'string' ? payload.userAgent : '';

  console.warn('[StaticLoadRecoveryTelemetry]', {
    reason,
    blockedInRetryWindow,
    totalCount,
    windowCount,
    path,
    deploymentId,
    userAgent,
    ip: request.headers.get('x-forwarded-for') ?? '',
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
