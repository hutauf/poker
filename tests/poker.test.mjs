import assert from 'node:assert/strict';
import { evaluate, calculate, cardName } from '../lib/poker.ts';
const cards = s => s.split(' ').map(x => {const c = Array.from({length:52},(_,i)=>i).find(i=>cardName(i)===x); assert.notEqual(c, undefined,x); return c;});
const category = s => Math.floor(evaluate(cards(s))/15**5);
const cases = ['A♠ J♥ 9♦ 6♣ 3♠','A♠ A♥ 9♦ 6♣ 3♠','A♠ A♥ 9♦ 9♣ 3♠','A♠ A♥ A♦ 6♣ 3♠','A♠ 2♥ 3♦ 4♣ 5♠','A♠ J♠ 9♠ 6♠ 3♠','A♠ A♥ A♦ 6♣ 6♠','A♠ A♥ A♦ A♣ 3♠','A♠ K♠ Q♠ J♠ 10♠'];
cases.forEach((s,i)=>assert.equal(category(s),i));
assert.equal(category('A♠ A♥ A♦ K♣ K♠ K♥ 2♣'),6);
assert.equal(category('2♠ 3♠ 4♠ 5♠ A♠ K♥ K♦'),8);
assert(evaluate(cards('A♠ A♥ K♦ Q♣ 9♠ 4♠ 2♣')) > evaluate(cards('A♠ A♥ K♦ Q♣ 8♠ 4♠ 2♣')));
const run = hand => new Promise(resolve=>calculate(hand,r=>{if(r.done)resolve(r)}));
let r = await run({players:[{id:1,mode:'known',cards:cards('2♥ 3♥')},{id:2,mode:'unknown',cards:[null,null]}],board:cards('A♠ K♠ Q♠ J♠ 10♠')});
assert.equal(r.exact,true);assert.equal(r.n,990);r.values.forEach(v=>assert.deepEqual(v,{win:0,tie:100,equity:50}));
r=await run({players:[{id:1,mode:'known',cards:cards('A♠ A♥')},{id:2,mode:'known',cards:cards('K♠ K♥')}],board:cards('2♠ 3♥ 7♦ 9♣')});
assert.equal(r.n,44);assert.equal(r.exact,true);assert(Math.abs(r.values[0].win-42/44*100)<1e-8);
// All unknown seats are simulated too: wins and ties must both be calculated.
for (const count of [2,5,10]) {
  r=await new Promise(resolve=>calculate({players:Array.from({length:count},(_,i)=>({id:i+1,mode:i ? 'unknown' : 'known',cards:[null,null]})),board:[null,null,null,null,null]}, value=>{
    assert.equal(value.method,'simulation'); assert.equal(value.exact,false);
    value.values.forEach(v=>assert.deepEqual(v,value.values[0]));
    assert(Math.abs(value.values.reduce((sum,v)=>sum+v.equity,0)-100)<1e-8);
    if(value.done)resolve(value);
  }));
  assert.equal(r.n,24000); assert(r.values[0].tie>0); assert(r.values[0].win<100/count);
}
// Mixed known/unknown hands: every partial update must respect exchangeability.
for (const count of [3,10]) {
  r=await new Promise(resolve=>calculate({players:[{id:1,mode:'known',cards:cards('A♠ A♥')},...Array.from({length:count-1},(_,i)=>({id:i+2,mode:'unknown',cards:[null,null]}))],board:[null,null,null,null,null]}, value=>{
    assert.equal(value.method,'simulation'); assert.equal(value.exact,false);
    value.values.slice(2).forEach(v=>assert.deepEqual(v,value.values[1]));
    assert(Math.abs(value.values.reduce((s,v)=>s+v.equity,0)-100)<1e-8);
    if(value.done)resolve(value);
  }));
  assert.equal(r.n,24000);
}
// Random assigns concrete cards; different visible hands must stay different.
r=await run({players:[{id:1,mode:'random',cards:cards('A♠ A♥')},{id:2,mode:'random',cards:cards('K♠ K♥')}],board:cards('2♠ 3♥ 7♦ 9♣ J♣')});
assert.equal(r.method,'enumeration'); assert.equal(r.exact,true); assert.equal(r.total,1);
assert.equal(r.values[0].win,100); assert.equal(r.values[1].win,0);
// A known flop has 990 unordered runouts: enumerate every one, even with holes in the board.
let updates=0;
r=await new Promise(resolve=>calculate({players:[{id:1,mode:'known',cards:cards('A♠ A♥')},{id:2,mode:'known',cards:cards('K♠ K♥')}],board:[...cards('2♠'),null,...cards('7♦'),null,...cards('9♣')]},value=>{
  updates++; assert.equal(value.method,'enumeration'); assert.equal(value.exact,value.done);
  if(value.done)resolve(value);
}));
assert.equal(r.total,990); assert.equal(r.n,990); assert(updates>=1);
assert(Math.abs(r.values.reduce((s,v)=>s+v.equity,0)-100)<1e-8);
console.log('PASS: hand rankings, exact enumeration, fully simulated symmetric seats, averaged unknown estimates, concrete random hands, progress accuracy and equity conservation.');
