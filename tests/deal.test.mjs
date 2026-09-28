import assert from 'node:assert/strict';
import { newHand, dealBoard, nextBoardSlots, usedCards, handLabel } from '../lib/poker.ts';
const source={players:Array.from({length:10},(_,i)=>({id:i+1,mode:'unknown',cards:[null,null]})),board:[0,1,2,3,4]};
const snapshot=structuredClone(source);
let h=newHand(source,true);
assert.deepEqual(source,snapshot);
assert.equal(usedCards(h).length,20); assert.equal(new Set(usedCards(h)).size,20);
assert(h.players.every(p=>p.mode==='random'&&p.cards.every(c=>c!==null)));
assert(h.board.every(c=>c===null));
for(const count of [3,4,5]) {
 const before=structuredClone(h); h=dealBoard(h);
 assert.equal(h.board.filter(c=>c!==null).length,count);
 before.board.forEach((c,i)=>{if(c!==null)assert.equal(h.board[i],c)});
 assert.deepEqual(h.players,before.players);
 assert.equal(new Set(usedCards(h)).size,20+count);
}
assert.deepEqual(nextBoardSlots(h.board),[]); assert.deepEqual(dealBoard(h),h);
const full=structuredClone(h); h.board[1]=null;
assert.deepEqual(nextBoardSlots(h.board),[1]);h=dealBoard(h);
[0,2,3,4].forEach(i=>assert.equal(h.board[i],full.board[i]));
assert.equal(new Set(usedCards(h)).size,25);
const empty=newHand(h,false);assert.equal(usedCards(empty).length,0);assert.deepEqual(empty.players.map(p=>p.id),source.players.map(p=>p.id));
assert.equal(handLabel([0,1,2,3,4],'en'),'Straight flush');
console.log('PASS: unique 10-player deals, flop/turn/river progression, gap filling, preserved cards, empty reset and English hand labels.');
