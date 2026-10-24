import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrafficPoller } from './trafficPolling.js';
function harness(load) {
  const timers=new Map(),statuses=[],errors=[],successes=[];let sequence=0,visible=true,online=true;
  const poller=createTrafficPoller({ load,onSuccess:r=>successes.push(r),onFailure:e=>errors.push(e),onStatus:s=>statuses.push(s),isVisible:()=>visible,isOnline:()=>online,now:()=>1000000,schedule:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id;},cancel:id=>timers.delete(id) });
  return {poller,timers,statuses,errors,successes,setOnline:value=>{online=value;},setVisible:value=>{visible=value;}};
}
test('failed requests back off, successful recovery resets cadence, and manual requests deduplicate', async () => {
  let fail=true,calls=0;
  const h=harness(async()=>{calls++;if(fail)throw new Error('temporary');return {meta:{dataState:'fresh'}};});
  await Promise.all([h.poller.refresh(),h.poller.refresh()]);
  assert.equal(calls,1);
  assert.equal([...h.timers.values()][0].delay,60000);
  await h.poller.refresh();assert.equal([...h.timers.values()][0].delay,120000);
  await h.poller.refresh();assert.equal([...h.timers.values()][0].delay,180000);
  fail=false;await h.poller.refresh();assert.equal([...h.timers.values()][0].delay,60000);
  assert.equal(h.statuses.at(-1).connectionState,'waiting');
  h.poller.stop();assert.equal(h.timers.size,0);
});
test('hidden and offline screens issue no requests; reconnect resumes immediately', async () => {
  let calls=0;const h=harness(async()=>{calls++;return {meta:{dataState:'fresh'}};});
  h.setVisible(false);await h.poller.refresh();assert.equal(calls,0);
  h.setVisible(true);h.setOnline(false);await h.poller.refresh();assert.equal(calls,0);assert.equal(h.statuses.at(-1).connectionState,'offline');assert.equal(h.timers.size,0);
  h.setOnline(true);await h.poller.refresh();assert.equal(calls,1);
  h.poller.pause();assert.equal(h.timers.size,0);
  h.poller.stop();
});
test('timeout aborts the request, schedules recovery, and disposal stops further work', async () => {
  const h=harness(signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')))));
  const request=h.poller.refresh();await Promise.resolve();
  const timeout=[...h.timers.values()].find(t=>t.delay===25000);assert.ok(timeout);timeout.fn();await request;
  assert.equal(h.errors[0].name,'AbortError');assert.equal(h.statuses.at(-1).connectionState,'recovering');
  h.poller.stop();await h.poller.refresh();assert.equal(h.timers.size,0);
});
test('partial data gets a recovery schedule rather than pretending refresh fully succeeded', async()=>{
  const h=harness(async()=>({meta:{dataState:'partial'}}));await h.poller.refresh();assert.equal(h.statuses.at(-1).connectionState,'recovering');assert.equal(h.successes.length,1);h.poller.stop();
});
