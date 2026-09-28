'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Undo2, RotateCcw, Shuffle, Plus, Minus, X, Check, Spade, ChevronDown, Maximize, Minimize, Coins } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initialHand, newHand, dealBoard, nextBoardSlots, cardName, usedCards, suits, ranks, handLabel, type Hand, type Mode, type Result } from '@/lib/poker';
import { calculate } from '@/lib/poker-client';
import { seatPositions, callMath, type SeatObstacle } from '@/lib/table';
type Target = { player: number | 'board'; slot: number };
type Snapshot = { hand: Hand; target: Target | null; selected: number };
const avatars = ['🦊','🐼','🐸','🐨','🦁','🐯','🐵','🐧','🐰','🐻'];
const colors = ['#ecc77e','#86beec','#b9d782','#d4aaed','#f0ae82','#efa3b9','#a8d1c6','#a9b3f0','#e5c4a3','#bfc699'];
export default function Home() {
  const [state, setState] = useState<Snapshot>({ hand: initialHand(), target: null, selected: 1 });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [pro, setPro] = useState(false);
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [autoDeal, setAutoDeal] = useState(false);
  const tr = (de: string, en: string) => language === 'de' ? de : en;
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const percent = (n?: number, estimated = false) => n === undefined ? '…' : `${estimated ? '~' : ''}${n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  const money = (n: number) => n.toLocaleString(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'de' ? 'Pokerlabor – Texas Hold’em entdecken' : 'Pokerlabor – Explore Texas Hold’em';
  }, [language]);
  const [pot, setPot] = useState('300');
  const [call, setCall] = useState('100');
  const [fullscreen, setFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1100, height: 650 });
  const arena = useRef<HTMLDivElement>(null);
  const { hand, target, selected } = state;
  const used = new Set(usedCards(hand));
  const selectedPlayer = hand.players.find(p => p.id === selected) || hand.players[0];
  const selectedIndex = hand.players.indexOf(selectedPlayer);
  const dense = hand.players.length > 6;
  const small = dimensions.width < 560 || dimensions.height < 410;
  const seatWidth = small ? dense ? 84 : 102 : dense ? 124 : 156;
  const seatHeight = small ? dense ? 108 : 132 : dense ? 140 : 175;
  const wideLandscape = dimensions.width >= 1024 && dimensions.width > dimensions.height;
  const centerObstacle: SeatObstacle | undefined = wideLandscape ? {
    left: dimensions.width / 2 - Math.min(dimensions.width * .27, 260),
    right: dimensions.width / 2 + Math.min(dimensions.width * .27, 260),
    // Keep the player seats out of the whole central lane, including the deal button.
    top: 0,
    bottom: dimensions.height,
  } : undefined;
  const positions = seatPositions(hand.players.length, dimensions.width, dimensions.height, seatWidth, seatHeight, { obstacle: centerObstacle });
  const commit = (h: Hand, t: Target | null = target, s = selected) => { setHistory(prev => [...prev, state].slice(-150)); setState({ hand: h, target: t, selected: s }); };
  const undo = useCallback(() => { if (!history.length) return; setState(history[history.length - 1]); setHistory(history.slice(0, -1)); }, [history]);
  useEffect(() => { setResult(null); return calculate(hand, setResult); }, [hand]);
  useEffect(() => {
    if (!arena.current) return;
    const observer = new ResizeObserver(([e]) => setDimensions({ width: e.contentRect.width, height: e.contentRect.height }));
    observer.observe(arena.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'Escape') setState(s => ({ ...s, target: null }));
    };
    window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener);
  }, [undo]);
  useEffect(() => { const fn = () => setFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', fn); return () => document.removeEventListener('fullscreenchange', fn); }, []);
  function nextTarget(h: Hand, current: Target): Target | null {
    const slots: Target[] = [...h.players.filter(p => p.mode !== 'unknown').flatMap(p => [0, 1].map(slot => ({ player: p.id, slot }))), ...[0, 1, 2, 3, 4].map(slot => ({ player: 'board' as const, slot }))];
    const index = slots.findIndex(t => t.player === current.player && t.slot === current.slot);
    return [...slots.slice(index + 1), ...slots.slice(0, index + 1)].find(t => (t.player === 'board' ? h.board[t.slot] : h.players.find(p => p.id === t.player)!.cards[t.slot]) === null) || null;
  }
  function openCard(t: Target) {
    const p = hand.players.find(p => p.id === t.player);
    if (p?.mode === 'unknown') { const h = structuredClone(hand); h.players.find(p => p.id === t.player)!.mode = 'known'; commit(h, t, p.id); }
    else setState({ hand, target: t, selected: typeof t.player === 'number' ? t.player : selected });
  }
  function selectCard(c: number) {
    if (!target || used.has(c)) return;
    const h = structuredClone(hand);
    if (target.player === 'board') h.board[target.slot] = c;
    else { const p = h.players.find(p => p.id === target.player)!; p.cards[target.slot] = c; p.mode = 'known'; }
    const next = nextTarget(h, target);
    commit(h, next, typeof next?.player === 'number' ? next.player : selected);
  }
  function clearCard(t: Target) {
    const h = structuredClone(hand);
    if (t.player === 'board') h.board[t.slot] = null;
    else { const p = h.players.find(p => p.id === t.player)!; p.cards[t.slot] = null; p.mode = 'known'; }
    commit(h, null, typeof t.player === 'number' ? t.player : selected);
  }
  function mode(id: number, m: Mode) {
    const h = structuredClone(hand), p = h.players.find(p => p.id === id)!;
    p.mode = m;
    if (m === 'unknown') p.cards = [null, null];
    if (m === 'random') {
      p.cards = [null, null]; const taken = new Set(usedCards(h));
      const available = Array.from({ length: 52 }, (_, i) => i).filter(c => !taken.has(c));
      p.cards = [available.splice(Math.floor(Math.random() * available.length), 1)[0], available.splice(Math.floor(Math.random() * available.length), 1)[0]];
    }
    commit(h, m === 'known' ? { player: id, slot: p.cards[0] === null ? 0 : 1 } : null, id);
  }
  function resetPlayer() {
    const h = structuredClone(hand); const p = h.players.find(p => p.id === selected)!; p.mode = 'known'; p.cards = [null, null]; commit(h, null);
  }
  function changeCount(delta: number) {
    const h = structuredClone(hand);
    if (delta > 0 && h.players.length < 10) { const id = Math.max(...h.players.map(p => p.id)) + 1; h.players.push({ id, mode: 'unknown', cards: [null, null] }); commit(h, null, id); }
    if (delta < 0 && h.players.length > 2) { const id = h.players.pop()!.id; commit(h, target?.player === id ? null : target, selected === id ? h.players[0].id : selected); }
  }
  const resetHand = () => commit(newHand(hand, autoDeal), null, hand.players[0].id);
  const boardSlots = nextBoardSlots(hand.board);
  const nextStreet = !boardSlots.length ? null : boardSlots[0] < 3 ? 'Flop' : boardSlots[0] === 3 ? 'Turn' : 'River';
  const dealStreetLabel = nextStreet ? tr(`${nextStreet} austeilen`, `Deal ${nextStreet.toLowerCase()}`) : tr('Alle Karten liegen', 'Board complete');
  function card(c: number | null, t: Target, unknown = false) {
    const active = target?.player === t.player && target.slot === t.slot;
    const label = `${t.player === 'board' ? tr('Tisch', 'Board') : tr('Spieler ', 'Player ') + t.player}, ${tr('Karte', 'card')} ${t.slot + 1}`;
    return <div className={`card-wrap ${active ? 'active-card' : ''}`}>
      <button className={`playing-card ${c === null ? 'empty' : ''} ${unknown ? 'unknown-card' : ''} ${c !== null && [1, 2].includes(Math.floor(c / 13)) ? 'red' : ''}`} aria-label={`${label}: ${c === null ? tr('unbekannt', 'unknown') : cardName(c)}`} aria-pressed={active} onClick={() => openCard(t)}>
        {c === null ? <span className="empty-mark">{unknown ? '?' : '+'}</span> : <><span className="card-rank">{ranks[c % 13]}</span><span className="card-suit">{suits[Math.floor(c / 13)]}</span></>}
      </button>
      {c !== null && <button className="remove-card" aria-label={tr(`${label} entfernen`, `Remove ${label}`)} title={tr('Diese Karte entfernen', 'Remove this card')} onClick={() => clearCard(t)}><X /></button>}
    </div>;
  }
  const targetText = target ? target.player === 'board' ? `${target.slot < 3 ? 'Flop' : target.slot === 3 ? 'Turn' : 'River'} · ${tr('Karte', 'Card')} ${target.slot + 1}` : tr(`Spieler ${target.player} · Karte ${target.slot + 1} von 2`, `Player ${target.player} · Card ${target.slot + 1} of 2`) : '';
  const partial = hand.players.some(p => p.mode !== 'unknown' && p.cards.some(c => c === null));
  const ownComplete = selectedPlayer.mode !== 'unknown' && selectedPlayer.cards.every(c => c !== null);
  const eq = result?.values[selectedIndex]?.equity;
  const estimated = !!result && !result.exact;
  const validMoney = pot.trim() !== '' && call.trim() !== '';
  const math = validMoney && eq !== undefined ? callMath(Number(pot), Number(call), eq) : null;
  const uncertain = !!math && !!result && !result.exact && Math.abs((eq || 0) - math.required) < 1;
  const verdict = !ownComplete ? tr('Erst deine Karten wählen', 'Choose your cards first') : !math ? tr('Beträge eingeben', 'Enter the amounts') : !result?.done ? tr('Wird berechnet …', 'Calculating …') : Number(call) === 0 ? tr('Checken kostet nichts', 'Checking is free') : uncertain ? tr('Sehr knappe Entscheidung', 'Too close to call') : Math.abs(math.ev) < .005 ? tr('Rechnerisch ausgeglichen', 'Break-even call') : math.ev > 0 ? tr('Mitgehen lohnt rechnerisch', 'Calling has positive value') : tr('Passen lohnt rechnerisch', 'Folding has better value');
  const status = !result ? tr('Berechne …', 'Calculating …') : result.method === 'enumeration' ? result.done ? tr(`Exakt · ${result.total.toLocaleString(locale)} Möglichkeiten`, `Exact · ${result.total.toLocaleString(locale)} outcomes`) : tr('Zähle alle Möglichkeiten · ~ Zwischenstand', 'Counting all outcomes · ~ In progress') : `${tr('~ Schätzung', '~ Estimate')}${result.done ? '' : tr(' · läuft …', ' · running …')}`;
  return <main className={`game ${pro ? 'is-pro' : ''}`}>
    <header className="game-header">
      <a href="#" className="brand" aria-label="Pokerlabor"><Spade fill="currentColor" /><span>POKER<span>LABOR</span><small>{tr('DEIN TISCH. DEIN EXPERIMENT.', 'YOUR TABLE. YOUR EXPERIMENT.')}</small></span></a>
      <div className="top-actions">
        <label className="pro-toggle"><span>{tr('Pro-Modus', 'Pro mode')}</span><Switch checked={pro} onCheckedChange={setPro} aria-label={tr('Pro-Modus', 'Pro mode')} /></label>
        <Select value={language} onValueChange={v => setLanguage(v as 'de' | 'en')}>
          <SelectTrigger size="sm" className="language-select" aria-label={tr('Sprache', 'Language')}><SelectValue /></SelectTrigger>
          <SelectContent className="language-options" position="popper" align="end"><SelectItem value="de">DE</SelectItem><SelectItem value="en">EN</SelectItem></SelectContent>
        </Select>
        <button className="fullscreen" aria-label={fullscreen ? tr('Vollbild verlassen', 'Exit fullscreen') : tr('Vollbild', 'Fullscreen')} title={tr('Vollbild', 'Fullscreen')} onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Fullscreen is optional in embedded browsers. */ } }}>{fullscreen ? <Minimize /> : <Maximize />}</button>
      </div>
    </header>
    <div className="game-body">
      <div ref={arena} className={`arena ${target ? 'picking' : ''} ${small ? 'small-seats' : ''} ${dense ? 'dense' : ''} ${hand.players.length >= 4 ? 'crowded' : ''}`} style={{ '--seat-width': `${seatWidth}px`, '--seat-height': `${seatHeight}px` } as React.CSSProperties}>
        <div className="table-surface" aria-hidden="true"><img className="table-art" src="/table.webp" alt="" /></div>
        <div className="table-wordmark" aria-hidden="true"><Spade /><span>POKERLABOR</span><small>TEXAS HOLD’EM</small></div>
        <div className="board-zone">
          <div className="board-heading"><span>{tr('GEMEINSAME KARTEN', 'COMMUNITY CARDS')}</span><button className="tiny-button" aria-label={tr('Tischkarten zurücksetzen', 'Reset board')} title={tr('Tischkarten zurücksetzen', 'Reset board')} onClick={() => commit({ ...hand, board: [null, null, null, null, null] }, null)}><RotateCcw /></button></div>
          <div className="community-cards">{[[0, 1, 2], [3], [4]].map((slots, i) => <div className="street" key={i}><div>{slots.map(slot => <div key={slot}>{card(hand.board[slot], { player: 'board', slot })}</div>)}</div><span>{['FLOP','TURN','RIVER'][i]}</span></div>)}</div>
          <button className="board-deal" disabled={!nextStreet} aria-label={dealStreetLabel} onClick={() => commit(dealBoard(hand), null)}><Shuffle /><span>{dealStreetLabel}</span></button>
          {pro && <span className="table-pot"><Coins size={14} /> {tr('Topf', 'Pot')} {validMoney && Number(pot) >= 0 ? money(Number(pot)) : '–'}</span>}
        </div>
        {hand.players.map((p, i) => {
          const v = result?.values[i]; const actual = [...p.cards, ...hand.board].filter((c): c is number => c !== null);
          return <section className={`seat ${selected === p.id ? 'selected-seat' : ''}`} key={p.id} aria-label={tr(`Platz Spieler ${p.id}`, `Player ${p.id} seat`)} style={{ left: positions[i].x, top: positions[i].y, '--seat-color': colors[i] } as React.CSSProperties}>
            <button className="seat-person" onClick={() => setState({ ...state, selected: p.id })} aria-label={tr(`Spieler ${p.id} auswählen`, `Select player ${p.id}`)} aria-pressed={selected === p.id}><span className="avatar">{avatars[i]}</span><span className="seat-name">{tr('Spieler', 'Player')} {p.id}{selected === p.id && <small>●</small>}</span></button>
            <div className="seat-hand">{p.cards.map((c, slot) => <div key={slot}>{card(c, { player: p.id, slot }, p.mode === 'unknown')}</div>)}</div>
            <div className="seat-chances"><span className="win-chance"><b>{percent(v?.win, estimated)}<small>%</small></b><span>{tr('Gewinnt', 'Wins')}</span></span><span className="tie-chance">{percent(v?.tie, estimated)} % {tr('teilt', 'ties')}</span>{pro && <span className="equity-chance">{percent(v?.equity, estimated)} % {tr('Topfanteil', 'equity')}</span>}</div>
            {!small && !dense && p.mode !== 'unknown' && p.cards.every(c => c !== null) && actual.length >= 5 && <span className="seat-hand-label">{handLabel(actual, language)}</span>}
          </section>;
        })}
        {target && <button className="picker-backdrop" type="button" aria-label={tr('Kartenauswahl schließen', 'Close card picker')} onClick={() => setState(s => ({ ...s, target: null }))} />}
        {target && <section className="card-picker" aria-label={tr('Kartenauswahl', 'Card picker')}>
          <div className="picker-header"><div><span className="picker-eyebrow">{tr('KARTE WÄHLEN', 'CHOOSE A CARD')}</span><strong>{targetText}</strong></div><div className="picker-actions"><button aria-label={tr('Ausgewählte Karte leeren', 'Clear selected card')} title={tr('Ausgewählte Karte leeren', 'Clear selected card')} onClick={() => clearCard(target)}><RotateCcw /></button><button onClick={undo} disabled={!history.length} aria-label={tr('Letzte Änderung rückgängig', 'Undo last change')} title={tr('Rückgängig', 'Undo')}><Undo2 /></button><button className="finish-picker" onClick={() => setState({ ...state, target: null })} aria-label={tr('Kartenauswahl schließen', 'Close card picker')}><Check /><span>{tr('Fertig', 'Done')}</span></button></div></div>
          <div className="deck" aria-label={tr('Alle 52 Spielkarten', 'All 52 cards')}>{suits.map((suit, s) => <div className={`suit-row ${s === 1 || s === 2 ? 'red' : ''}`} key={suit}><span aria-hidden="true">{suit}</span>{ranks.map((rank, r) => { const c = s * 13 + r; return <button className="deck-card" key={c} disabled={used.has(c)} aria-label={`${cardName(c)}${used.has(c) ? tr(', bereits verwendet', ', already used') : ''}`} onClick={() => selectCard(c)}><b>{rank}</b><small>{used.has(c) ? <Check /> : suit}</small></button>; })}</div>)}</div>
          <div className="picker-foot"><span>{52 - used.size} {tr('Karten frei', 'cards available')}</span></div>
        </section>}
        {pro && !target && <button className="pro-jump" onClick={() => document.getElementById('pro-calculation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{tr('Topf & Mitgehen', 'Pot & calling')} <ChevronDown size={13} /></button>}
        <div className="table-status" aria-live="polite">{status}{partial && <span> · {tr('Leere Karten sind unbekannt.', 'Empty cards are unknown.')}</span>}</div>
      </div>
      {pro && <aside id="pro-calculation" className="pro-panel" aria-label={tr('Pro-Berechnung', 'Pro calculation')}>
        <div className="pro-heading"><span>{tr('MITGEHEN ODER PASSEN?', 'CALL OR FOLD?')}</span><button aria-label={tr('Pro-Modus schließen', 'Close Pro mode')} onClick={() => setPro(false)}><X /></button></div>
        <div className="pro-player"><span>{avatars[selectedIndex]}</span><div><h2>{tr('Spieler', 'Player')} {selected}</h2><p>{tr('Anderen Platz antippen zum Wechseln.', 'Tap another seat to switch players.')}</p></div></div>
        <div className="pro-inputs">
          <label>{tr('Topf jetzt', 'Current pot')} <span>{tr('inkl. gegnerischem Gebot', 'including the opponent’s bet')}</span><div><input type="number" inputMode="decimal" min="0" step="any" value={pot} onChange={e => setPot(e.target.value)} aria-label={tr('Topf inklusive gegnerischem Gebot', 'Pot including the opponent’s bet')} /><span>$</span></div></label>
          <label>{tr('Noch zu zahlen', 'Amount to call')} <span>{tr('dein zusätzlicher Einsatz', 'your additional contribution')}</span><div><input type="number" inputMode="decimal" min="0" step="any" value={call} onChange={e => setCall(e.target.value)} aria-label={tr('Zusätzlicher Einsatz zum Mitgehen', 'Additional amount to call')} /><span>$</span></div></label>
        </div>
        <div className="pro-comparison"><div><span>{tr('Dein Topfanteil', 'Your equity')}</span><b>{ownComplete ? percent(eq, estimated) : '–'}<small>%</small></b></div><div><span>{tr('Benötigt', 'Required')}</span><b>{math ? percent(math.required) : '–'}<small>%</small></b></div></div>
        <div className={`verdict ${ownComplete && math && result?.done ? uncertain ? 'close-call' : math.ev >= 0 ? 'positive' : 'negative' : ''}`}><strong>{verdict}</strong>{ownComplete && math && result?.done && <span>{tr('Erwarteter Gewinn beim Mitgehen:', 'Expected profit per call:')} <b>{estimated ? '~' : ''}{math.ev >= 0 ? '+' : ''}{money(math.ev)}</b></span>}</div>
        <details className="pro-details"><summary>{tr('Wie wird gerechnet?', 'How is it calculated?')} <ChevronDown size={15} /></summary><p><b>{tr('Benötigter Topfanteil', 'Required equity')}</b> = {tr('dein Einsatz ÷ (Topf jetzt + dein Einsatz).', 'your call ÷ (current pot + your call).')}</p><p><b>{tr('Erwarteter Gewinn', 'Expected profit')}</b> = {tr('Topfanteil × (Topf + dein Einsatz) − dein Einsatz.', 'equity × (pot + your call) − your call.')}</p><p>{tr('Der Topfanteil ist dein durchschnittlicher Anteil am Topf, inklusive geteilter Siege. Deine bereits gezahlten Einsätze gehören zum Topf.', 'Equity is your average share of the pot, including ties. Your previous contributions already belong to the pot.')}</p></details>
        <p className="model-note">{tr('Lernmodell: Alle bleiben bis zum Aufdecken dabei. Keine weiteren Einsätze, keine Gebühren, keine Nebentöpfe. Unbekannt bedeutet: Jede noch mögliche Hand ist gleich wahrscheinlich.', 'Learning model: Everyone stays until showdown. No further bets, no rake, no side pots. Unknown means every remaining possible hand is equally likely.')}{uncertain && tr(' Die Schätzung ist für diese knappe Entscheidung zu ungenau.', ' This estimate is too uncertain for such a close decision.')}</p>
      </aside>}
    </div>
    <div className="control-dock">
      <div className="selected-controls">
        <span className="selected-caption"><span>{avatars[selectedIndex]}</span><b>{tr('Spieler', 'Player')} {selected}</b></span>
        <RadioGroup className="hand-modes" value={selectedPlayer.mode === 'random' ? 'known' : selectedPlayer.mode} onValueChange={m => mode(selected, m as Mode)} aria-label={tr(`Kartenmodus Spieler ${selected}`, `Card mode for player ${selected}`)}><label><RadioGroupItem value="known" aria-label={tr('Bekannt', 'Known')} /><span>{tr('Bekannt', 'Known')}</span></label><label><RadioGroupItem value="unknown" aria-label={tr('Unbekannt', 'Unknown')} /><span>{tr('Unbekannt', 'Unknown')}</span></label></RadioGroup>
        <button className="dock-button" aria-label={tr(`Spieler ${selected} zufällig austeilen`, `Deal random cards to player ${selected}`)} title={tr('Zufällige Hand', 'Random hand')} onClick={() => mode(selected, 'random')}><Shuffle /><span>{tr('Zufall', 'Random')}</span></button>
        <button className="dock-button icon-only" aria-label={tr(`Spieler ${selected} zurücksetzen`, `Reset player ${selected}`)} title={tr('Spieler zurücksetzen', 'Reset player')} onClick={resetPlayer}><RotateCcw /></button>
      </div>
      <div className="global-controls">
        <div className="player-count"><button onClick={() => changeCount(-1)} disabled={hand.players.length <= 2} aria-label={tr('Spieler entfernen', 'Remove player')}><Minus /></button><span>{hand.players.length}<small>{tr('Spieler', 'Players')}</small></span><button onClick={() => changeCount(1)} disabled={hand.players.length >= 10} aria-label={tr('Spieler hinzufügen', 'Add player')}><Plus /></button></div>
        <button className="dock-button undo" onClick={undo} disabled={!history.length} aria-label={tr('Rückgängig', 'Undo')}><Undo2 /><span>{tr('Rückgängig', 'Undo')}</span></button>
        <label className="auto-deal" title={tr('Bei jeder neuen Hand allen Spielern zwei Karten austeilen', 'Deal two cards to every player with each new hand')}><Checkbox checked={autoDeal} onCheckedChange={v => setAutoDeal(v === true)} aria-label={tr('Bei neuer Hand Karten austeilen', 'Deal cards on new hand')} /><span>{tr('Austeilen', 'Deal cards')}</span></label>
        <button className="dock-button reset-hand" onClick={resetHand} aria-label={tr('Neue Hand', 'New hand')} title={tr('Neue Hand', 'New hand')}><RotateCcw /><span>{tr('Neue Hand', 'New hand')}</span></button>
      </div>
    </div>
  </main>;
}
