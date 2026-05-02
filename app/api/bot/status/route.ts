import { NextResponse } from 'next/server';
import { getBotState } from '@/lib/services/db.service';

export async function GET() {
  try {
    const isRunning = getBotState('is_running') === '1';
    const lastHeartbeat = getBotState('last_heartbeat') ?? null;
    const daemonStartedAt = getBotState('daemon_started_at') ?? null;

    let uptimeSec: number | null = null;
    if (isRunning && daemonStartedAt) {
      uptimeSec = Math.floor((Date.now() - new Date(daemonStartedAt).getTime()) / 1000);
    }

    // Detect stale daemon (no heartbeat for > 60s means daemon is not running)
    const heartbeatAge = lastHeartbeat
      ? Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000)
      : null;
    const daemonAlive = heartbeatAge !== null && heartbeatAge < 60;

    return NextResponse.json({
      isRunning: isRunning && daemonAlive,
      lastHeartbeat,
      heartbeatAgeSec: heartbeatAge,
      uptimeSec,
      daemonAlive,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
