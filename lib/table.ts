export type SeatPoint = { x: number; y: number };
// Equal arc-length spacing keeps seats apart at the narrow ends of a tall table.
export function seatPositions(count: number, width: number, height: number, seatWidth: number, seatHeight: number): SeatPoint[] {
  const rx = Math.max(1, (width - seatWidth) / 2 - 14), ry = Math.max(1, (height - seatHeight) / 2 - 12);
  const steps = 720, points: SeatPoint[] = [], lengths = [0];
  for (let i = 0; i <= steps; i++) {
    const start = width > height && height < 410 ? 0 : Math.PI / 2;
    const a = start + i / steps * Math.PI * 2;
    points.push({ x: width / 2 + rx * Math.cos(a), y: height / 2 + ry * Math.sin(a) });
    if (i) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return Array.from({ length: count }, (_, i) => {
    const distance = lengths[steps] * i / count;
    const at = lengths.findIndex(v => v >= distance);
    return points[at];
  });
}
export function callMath(pot: number, call: number, equity: number) {
  if (![pot, call, equity].every(Number.isFinite) || pot < 0 || call < 0 || equity < 0 || equity > 100) return null;
  const finalPot = pot + call;
  return { required: finalPot ? call / finalPot * 100 : 0, ev: equity / 100 * finalPot - call, finalPot };
}
