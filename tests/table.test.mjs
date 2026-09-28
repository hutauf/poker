import assert from 'node:assert/strict';
import { callMath, seatPositions } from '../lib/table.ts';
assert.deepEqual(callMath(300,100,25),{required:25,ev:0,finalPot:400});
assert.equal(callMath(300,100,50).ev,100);
assert.equal(callMath(300,100,10).ev,-60);
assert.equal(callMath(0,0,40).required,0);
assert.equal(callMath(-1,100,50),null);
assert.equal(callMath(300,NaN,50),null);
for(const [w,h,sw,sh] of [[390,650,84,108],[1366,650,124,140],[844,290,84,108]]){
 for(let n=2;n<=10;n++){
  const p=seatPositions(n,w,h,sw,sh);
  assert.equal(p.length,n);
  for(const s of p){assert(s.x-sw/2>=0);assert(s.x+sw/2<=w);assert(s.y-sh/2>=0);assert(s.y+sh/2<=h);}
 }
}
console.log('PASS: call threshold, positive/negative EV, free check, invalid input, seat bounds for 2–10 players in portrait and landscape.');
