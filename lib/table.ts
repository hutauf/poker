export type SeatPoint = { x: number; y: number };
export type SeatObstacle = { left: number; top: number; right: number; bottom: number };
// Equal arc-length spacing keeps seats apart at the narrow ends of a tall table.
export function seatPositions(count: number, width: number, height: number, seatWidth: number, seatHeight: number, options: { obstacle?: SeatObstacle } = {}): SeatPoint[] {
  const rx = Math.max(1, (width - seatWidth) / 2 - 14), ry = Math.max(1, (height - seatHeight) / 2 - 12);
  const steps = 720, points: SeatPoint[] = [], lengths = [0];
  const start = width > height && height < 410 ? 0 : Math.PI / 2;
  for (let i = 0; i <= steps; i++) {
    const a = start + i / steps * Math.PI * 2;
    points.push({ x: width / 2 + rx * Math.cos(a), y: height / 2 + ry * Math.sin(a) });
    if (i) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const perimeter = lengths[steps];
  const pointAt = (distance: number): SeatPoint => {
    const target = ((distance % perimeter) + perimeter) % perimeter;
    let low = 0, high = steps;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (lengths[middle] < target) low = middle + 1;
      else high = middle;
    }
    const before = Math.max(0, low - 1), segment = lengths[low] - lengths[before];
    const fraction = segment ? (target - lengths[before]) / segment : 0;
    return {
      x: points[before].x + (points[low].x - points[before].x) * fraction,
      y: points[before].y + (points[low].y - points[before].y) * fraction,
    };
  };
  const obstacle = options.obstacle;
  if (!obstacle || count < 2) {
    return Array.from({ length: count }, (_, i) => pointAt(perimeter * i / count));
  }

  // Search for a ring rotation that keeps seats outside the central board corridor.
  // The same overlap score adapts to every player count without angle tables.
  const obstacleX = (obstacle.left + obstacle.right) / 2;
  const obstacleY = (obstacle.top + obstacle.bottom) / 2;
  const samples = Math.max(72, count * 24);
  let bestOffset = 0, bestOverlap = Infinity, bestGap = -Infinity, bestTotalGap = -Infinity;
  for (let sample = 0; sample < samples; sample++) {
    const offset = perimeter * sample / samples / count;
    let overlap = 0, smallestGap = Infinity, totalGap = 0;
    for (let i = 0; i < count; i++) {
      const seat = pointAt(offset + perimeter * i / count);
      const overlapWidth = Math.max(0, Math.min(seat.x + seatWidth / 2, obstacle.right) - Math.max(seat.x - seatWidth / 2, obstacle.left));
      const overlapHeight = Math.max(0, Math.min(seat.y + seatHeight / 2, obstacle.bottom) - Math.max(seat.y - seatHeight / 2, obstacle.top));
      overlap += overlapWidth * overlapHeight;
      const dx = Math.max(0, Math.abs(seat.x - obstacleX) - (obstacle.right - obstacle.left + seatWidth) / 2);
      const dy = Math.max(0, Math.abs(seat.y - obstacleY) - (obstacle.bottom - obstacle.top + seatHeight) / 2);
      const gap = Math.hypot(dx, dy);
      smallestGap = Math.min(smallestGap, gap);
      totalGap += gap;
    }
    if (overlap < bestOverlap || overlap === bestOverlap && (smallestGap > bestGap || smallestGap === bestGap && totalGap > bestTotalGap)) {
      bestOffset = offset;
      bestOverlap = overlap;
      bestGap = smallestGap;
      bestTotalGap = totalGap;
    }
  }
  return Array.from({ length: count }, (_, i) => pointAt(bestOffset + perimeter * i / count));
}
export function callMath(pot: number, call: number, equity: number) {
  if (![pot, call, equity].every(Number.isFinite) || pot < 0 || call < 0 || equity < 0 || equity > 100) return null;
  const finalPot = pot + call;
  return { required: finalPot ? call / finalPot * 100 : 0, ev: equity / 100 * finalPot - call, finalPot };
}
