export type Mode = 'known' | 'unknown' | 'random';
export type Player = { id: number; mode: Mode; cards: (number | null)[] };
export type Hand = { players: Player[]; board: (number | null)[] };
export const suits = ['♠', '♥', '♦', '♣'];
export const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
export const cardName = (c: number) => ranks[c % 13] + suits[Math.floor(c / 13)];
export const initialHand = (): Hand => ({ players: [{ id: 1, mode: 'known', cards: [null, null] }, { id: 2, mode: 'unknown', cards: [null, null] }], board: [null, null, null, null, null] });
export const usedCards = (h: Hand) => [...h.board, ...h.players.flatMap(p => p.mode === 'unknown' ? [] : p.cards)].filter((c): c is number => c !== null);
function drawCards(hand: Hand, count: number) {
  const used = new Set(usedCards(hand));
  const deck = Array.from({ length: 52 }, (_, i) => i).filter(c => !used.has(c));
  return Array.from({ length: count }, () => deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
}
export function newHand(hand: Hand, deal: boolean): Hand {
  const next: Hand = { players: hand.players.map((p, i) => ({ id: p.id, mode: i === 0 ? 'known' : 'unknown', cards: [null, null] })), board: [null, null, null, null, null] };
  if (deal) {
    const cards = drawCards(next, next.players.length * 2);
    next.players.forEach((p, i) => { p.mode = 'random'; p.cards = cards.slice(i * 2, i * 2 + 2); });
  }
  return next;
}
// Fill only missing cards in the earliest incomplete street, preserving manual choices.
export function nextBoardSlots(board: (number | null)[]) {
  return [[0, 1, 2], [3], [4]].map(slots => slots.filter(i => board[i] === null)).find(slots => slots.length) || [];
}
export function dealBoard(hand: Hand): Hand {
  const slots = nextBoardSlots(hand.board), cards = drawCards(hand, slots.length);
  const next = structuredClone(hand);
  slots.forEach((slot, i) => { next.board[slot] = cards[i]; });
  return next;
}
const pack = (category: number, values: number[]) => { let n = category; for (let i = 0; i < 5; i++) n = n * 15 + (values[i] || 0); return n; };
function straight(counts: number[]) { for (let top = 14; top >= 5; top--) { let ok = true; for (let j = 0; j < 5; j++) if (!counts[top - j === 1 ? 14 : top - j]) ok = false; if (ok) return top; } return 0; }
// Evaluate the best five of five to seven cards; category then every relevant kicker.
export function evaluate(cards: number[]) {
  const count = Array(15).fill(0), suitCounts = Array(4).fill(0);
  for (const c of cards) { count[14 - c % 13]++; suitCounts[Math.floor(c / 13)]++; }
  const descending = Array.from({ length: 13 }, (_, i) => 14 - i);
  const flushSuit = suitCounts.findIndex(n => n >= 5);
  let flush: number[] = [];
  if (flushSuit >= 0) {
    const fc = Array(15).fill(0);
    for (const c of cards) if (Math.floor(c / 13) === flushSuit) fc[14 - c % 13]++;
    const sf = straight(fc); if (sf) return pack(8, [sf]);
    flush = descending.filter(r => fc[r]).slice(0, 5);
  }
  const fours = descending.filter(r => count[r] === 4), trips = descending.filter(r => count[r] >= 3), pairs = descending.filter(r => count[r] >= 2);
  if (fours.length) return pack(7, [fours[0], descending.find(r => r !== fours[0] && count[r])!]);
  if (trips.length && pairs.some(r => r !== trips[0])) return pack(6, [trips[0], pairs.find(r => r !== trips[0])!]);
  if (flush.length) return pack(5, flush);
  const st = straight(count); if (st) return pack(4, [st]);
  if (trips.length) return pack(3, [trips[0], ...descending.filter(r => r !== trips[0] && count[r]).slice(0, 2)]);
  if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], descending.find(r => !pairs.slice(0, 2).includes(r) && count[r])!]);
  if (pairs.length) return pack(1, [pairs[0], ...descending.filter(r => r !== pairs[0] && count[r]).slice(0, 3)]);
  return pack(0, descending.filter(r => count[r]).slice(0, 5));
}
export const handLabel = (cards: number[], language: 'de' | 'en' = 'de') => (language === 'de' ? ['Höchste Karte', 'Ein Paar', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush'] : ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'])[Math.floor(evaluate(cards) / 15 ** 5)];
export type Result = { n: number; total: number; exact: boolean; done: boolean; method: 'enumeration' | 'simulation'; values: { win: number; tie: number; equity: number }[] };
const choose = (n: number, k: number) => { let x = 1; for (let i = 1; i <= k; i++) x = x * (n - i + 1) / i; return Math.round(x); };
export function calculate(hand: Hand, update: (r: Result) => void) {
  let cancelled = false;
  const known = hand.players.map(p => p.mode === 'unknown' ? [] : p.cards.filter((c): c is number => c !== null));
  const board = hand.board.filter((c): c is number => c !== null);
  const used = new Set(usedCards(hand)), deck = Array.from({ length: 52 }, (_, i) => i).filter(c => !used.has(c));
  const needs = [...known.map(c => 2 - c.length), 5 - board.length];
  let possibilities = 1, remaining = deck.length;
  for (const need of needs) { possibilities *= choose(remaining, need); remaining -= need; }
  const allHoleCardsKnown = hand.players.every(p => p.mode !== 'unknown' && p.cards.every(c => c !== null));
  const exact = allHoleCardsKnown || possibilities <= 30000, total = exact ? possibilities : 24000;
  const unknownSeats = known.flatMap((cards, i) => cards.length === 0 ? [i] : []);
  const wins = known.map(() => 0), ties = known.map(() => 0), equity = known.map(() => 0);
  let n = 0;
  function* combinations(arr: number[], k: number, start = 0, picked: number[] = []): Generator<number[]> {
    if (!k) { yield picked; return; }
    for (let i = start; i <= arr.length - k; i++) yield* combinations(arr, k - 1, i + 1, [...picked, arr[i]]);
  }
  function* outcomes(group: number, available: number[], assigned: number[][] = []): Generator<number[][]> {
    if (group === needs.length) { yield assigned; return; }
    for (const chosen of combinations(available, needs[group])) yield* outcomes(group + 1, available.filter(c => !chosen.includes(c)), [...assigned, chosen]);
  }
  const iterator = exact ? outcomes(0, deck) : null;
  function sample() {
    if (iterator) return iterator.next().value as number[][];
    const d = [...deck]; let at = 0;
    return needs.map(need => Array.from({ length: need }, () => { const j = at + Math.floor(Math.random() * (d.length - at)); [d[at], d[j]] = [d[j], d[at]]; return d[at++]; }));
  }
  function chunk() {
    if (cancelled) return;
    const start = performance.now();
    do {
      const drawn = sample(), b = [...board, ...drawn[known.length]];
      const scores = known.map((cards, i) => evaluate([...cards, ...drawn[i], ...b]));
      const best = Math.max(...scores), winners = scores.flatMap((s, i) => s === best ? [i] : []);
      for (const i of winners) { if (winners.length === 1) wins[i]++; else ties[i]++; equity[i] += 1 / winners.length; }
      n++;
    } while (n < total && performance.now() - start < 8);
    const values = known.map((_, i) => ({ win: wins[i] / n * 100, tie: ties[i] / n * 100, equity: equity[i] / n * 100 }));
    // Average exchangeable seats on every update, preserving their total share.
    // Random deals with visible cards are concrete hands, not exchangeable seats.
    if (unknownSeats.length > 1) {
      const average = { win: 0, tie: 0, equity: 0 };
      for (const i of unknownSeats) for (const key of ['win', 'tie', 'equity'] as const) average[key] += values[i][key] / unknownSeats.length;
      for (const i of unknownSeats) values[i] = { ...average };
    }
    update({ n, total, exact: exact && n === total, done: n === total, method: exact ? 'enumeration' : 'simulation', values });
    if (n < total) timer = setTimeout(chunk, 0);
  }
  let timer = setTimeout(chunk, 80);
  return () => { cancelled = true; clearTimeout(timer); };
}
