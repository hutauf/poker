import PokerWorker from './poker-worker.ts?worker&inline';
import { calculate as calculateLocally, getCalculationPlan, type Hand, type Result, type ShardResult } from './poker';

export function calculate(hand: Hand, update: (result: Result) => void) {
  if (typeof Worker === 'undefined') return calculateLocally(hand, update);

  const plan = getCalculationPlan(hand);
  const seed = (() => {
    try { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0]; }
    catch { return Math.floor(Math.random() * 0x100000000); }
  })();
  const workers: Worker[] = [];
  const playerCount = hand.players.length;
  const latest: ShardResult[] = Array.from({ length: plan.workerCount }, () => ({
    n: 0, total: 0, done: false,
    wins: Array(playerCount).fill(0), ties: Array(playerCount).fill(0), equity: Array(playerCount).fill(0),
  }));
  const finishedWorkers = new Set<number>();
  let cancelled = false;
  let finished = false;
  let lastPublish = 0;
  let publishTimer: ReturnType<typeof setInterval> | undefined;
  let fallbackCancel: (() => void) | undefined;

  const terminateWorkers = () => workers.forEach(worker => worker.terminate());
  const cancelTimer = () => { if (publishTimer !== undefined) clearInterval(publishTimer); };
  const fallback = () => {
    if (cancelled || finished || fallbackCancel) return;
    cancelTimer();
    terminateWorkers();
    fallbackCancel = calculateLocally(hand, update);
  };

  function publish(force = false) {
    if (cancelled || finished) return;
    const now = performance.now();
    if (!force && now - lastPublish < 80) return;
    if (!force && latest.some(result => result.n === 0 && !result.done)) return;
    const n = latest.reduce((sum, result) => sum + result.n, 0);
    if (!n) return;
    const win = latest[0].wins.map((_, i) => latest.reduce((sum, result) => sum + result.wins[i], 0));
    const tie = latest[0].ties.map((_, i) => latest.reduce((sum, result) => sum + result.ties[i], 0));
    const equity = latest[0].equity.map((_, i) => latest.reduce((sum, result) => sum + result.equity[i], 0));
    const values = win.map((_, i) => ({ win: win[i] / n * 100, tie: tie[i] / n * 100, equity: equity[i] / n * 100 }));
    const unknownSeats = hand.players.flatMap((player, i) => player.mode === 'unknown' || player.cards.every(card => card === null) ? [i] : []);
    if (unknownSeats.length > 1) {
      const average = { win: 0, tie: 0, equity: 0 };
      for (const i of unknownSeats) for (const key of ['win', 'tie', 'equity'] as const) average[key] += values[i][key] / unknownSeats.length;
      for (const i of unknownSeats) values[i] = { ...average };
    }
    const done = finishedWorkers.size === workers.length;
    update({ n, total: plan.total, exact: plan.exact && done, done, method: plan.method, values });
    lastPublish = now;
    if (done) {
      finished = true;
      cancelTimer();
      terminateWorkers();
    }
  }

  try {
    for (let i = 0; i < plan.workerCount; i++) workers.push(new PokerWorker());
  } catch {
    terminateWorkers();
    return calculateLocally(hand, update);
  }

  publishTimer = setInterval(() => publish(), 80);
  workers.forEach((worker, i) => {
    worker.onmessage = event => {
      if (cancelled || finished) return;
      latest[i] = event.data as ShardResult;
      if (latest[i].done) finishedWorkers.add(i);
      publish(finishedWorkers.size === workers.length);
    };
    worker.onerror = fallback;
    worker.postMessage({ hand, workerIndex: i, workerCount: plan.workerCount, seed });
  });

  return () => {
    cancelled = true;
    cancelTimer();
    terminateWorkers();
    fallbackCancel?.();
  };
}
