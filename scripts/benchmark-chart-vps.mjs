import { chromium } from '@playwright/test';

const DEMO_PATH = '/0xb83de012dba672c76a7dbbbf3e459cb59d7d6e36/btc/';

function mean(values) {
  if (!values?.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function percentile(values, p) {
  if (!values?.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function fmt(n, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
}

async function runScenario(label, baseUrl, durationMs = 45000) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-gpu', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    const perf = {
      start: performance.now(),
      frameDeltas: [],
      wsToFrame: [],
      longTasks: [],
      frameCount: 0,
      wsCount: 0,
      lastFrameTs: performance.now(),
    };

    window.__chartBench = perf;

    const frameLoop = (ts) => {
      const delta = ts - perf.lastFrameTs;
      if (delta > 0 && delta < 1000) {
        perf.frameDeltas.push(delta);
      }
      perf.lastFrameTs = ts;
      perf.frameCount += 1;
      requestAnimationFrame(frameLoop);
    };
    requestAnimationFrame(frameLoop);

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            perf.longTasks.push(entry.duration);
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch (_e) {
        // ignore
      }
    }

    const NativeWebSocket = window.WebSocket;
    function BenchWebSocket(...args) {
      const ws = new NativeWebSocket(...args);
      ws.addEventListener('message', () => {
        const t0 = performance.now();
        perf.wsCount += 1;
        // Use two RAFs so we measure after at least one paint cycle following the message.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            perf.wsToFrame.push(performance.now() - t0);
          });
        });
      });
      return ws;
    }

    BenchWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(BenchWebSocket, NativeWebSocket);
    window.WebSocket = BenchWebSocket;
  });

  const url = `${baseUrl}${DEMO_PATH}`;
  const startedAt = Date.now();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('canvas', { timeout: 45000 });
    await page.waitForTimeout(durationMs);

    const raw = await page.evaluate(() => {
      const p = window.__chartBench || {
        frameDeltas: [],
        wsToFrame: [],
        longTasks: [],
        frameCount: 0,
        wsCount: 0,
      };
      return {
        frameDeltas: p.frameDeltas,
        wsToFrame: p.wsToFrame,
        longTasks: p.longTasks,
        frameCount: p.frameCount,
        wsCount: p.wsCount,
      };
    });

    const frameAvg = mean(raw.frameDeltas);
    const frameP95 = percentile(raw.frameDeltas, 95);
    const fpsAvg = frameAvg > 0 ? 1000 / frameAvg : 0;

    const tickLatencyAvg = mean(raw.wsToFrame);
    const tickLatencyP95 = percentile(raw.wsToFrame, 95);

    const longTaskAvg = mean(raw.longTasks);
    const longTaskP95 = percentile(raw.longTasks, 95);

    return {
      label,
      ok: true,
      url,
      durationSec: (Date.now() - startedAt) / 1000,
      frames: raw.frameCount,
      wsMessages: raw.wsCount,
      fpsAvg,
      renderMsAvg: frameAvg,
      renderMsP95: frameP95,
      tickLatencyMsAvg: tickLatencyAvg,
      tickLatencyMsP95: tickLatencyP95,
      longTaskCount: raw.longTasks.length,
      longTaskMsAvg: longTaskAvg,
      longTaskMsP95: longTaskP95,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

function printResult(result) {
  if (!result.ok) {
    console.log(`\n[${result.label}] FAILED`);
    console.log(`URL: ${result.url}`);
    console.log(`Error: ${result.error}`);
    return;
  }

  console.log(`\n[${result.label}]`);
  console.log(`URL: ${result.url}`);
  console.log(`Duration: ${fmt(result.durationSec, 1)}s`);
  console.log(`Frames: ${result.frames}`);
  console.log(`WS messages: ${result.wsMessages}`);
  console.log(`FPS avg: ${fmt(result.fpsAvg)}`);
  console.log(`Render frame ms avg/p95: ${fmt(result.renderMsAvg)} / ${fmt(result.renderMsP95)}`);
  console.log(`Tick latency ms avg/p95: ${fmt(result.tickLatencyMsAvg)} / ${fmt(result.tickLatencyMsP95)}`);
  console.log(`Long tasks count: ${result.longTaskCount}`);
  console.log(`Long task ms avg/p95: ${fmt(result.longTaskMsAvg)} / ${fmt(result.longTaskMsP95)}`);
}

function printDiff(before, after) {
  if (!before?.ok || !after?.ok) return;

  const diff = {
    fpsAvg: after.fpsAvg - before.fpsAvg,
    renderMsAvg: after.renderMsAvg - before.renderMsAvg,
    renderMsP95: after.renderMsP95 - before.renderMsP95,
    tickLatencyMsAvg: after.tickLatencyMsAvg - before.tickLatencyMsAvg,
    tickLatencyMsP95: after.tickLatencyMsP95 - before.tickLatencyMsP95,
    longTaskCount: after.longTaskCount - before.longTaskCount,
  };

  console.log('\n[DIFF after - before]');
  console.log(`FPS avg: ${fmt(diff.fpsAvg)} (${diff.fpsAvg >= 0 ? 'improved' : 'worse'})`);
  console.log(`Render ms avg: ${fmt(diff.renderMsAvg)} (${diff.renderMsAvg <= 0 ? 'improved' : 'worse'})`);
  console.log(`Render ms p95: ${fmt(diff.renderMsP95)} (${diff.renderMsP95 <= 0 ? 'improved' : 'worse'})`);
  console.log(`Tick latency ms avg: ${fmt(diff.tickLatencyMsAvg)} (${diff.tickLatencyMsAvg <= 0 ? 'improved' : 'worse'})`);
  console.log(`Tick latency ms p95: ${fmt(diff.tickLatencyMsP95)} (${diff.tickLatencyMsP95 <= 0 ? 'improved' : 'worse'})`);
  console.log(`Long tasks count: ${diff.longTaskCount}`);
}

async function main() {
  const beforeUrl = process.env.BENCH_BEFORE_URL || 'http://127.0.0.1:3101';
  const afterUrl = process.env.BENCH_AFTER_URL || 'http://127.0.0.1:3001';
  const durationMs = Number(process.env.BENCH_DURATION_MS || '45000');

  console.log('Running chart benchmark...');
  console.log(`Before: ${beforeUrl}${DEMO_PATH}`);
  console.log(`After:  ${afterUrl}${DEMO_PATH}`);
  console.log(`Duration per scenario: ${durationMs} ms`);

  const before = await runScenario('before', beforeUrl, durationMs);
  const after = await runScenario('after', afterUrl, durationMs);

  printResult(before);
  printResult(after);
  printDiff(before, after);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
