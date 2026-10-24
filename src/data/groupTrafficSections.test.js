import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTrafficSections } from './groupTrafficSections.js';
const section = (id,routeId,level,length) => ({ id,routeId,routeName:routeId,level,affectedLengthMeters:length,lastUpdated:'2026-10-24T12:00:00Z',path:[{lat:24,lng:85},{lat:24.001,lng:85}] });
test('one card per route direction, with exact separate section geometry and the worst section first', () => {
  const slow=section('slow','outbound','moderate',500),heavy=section('jam','outbound','heavy',100),reverse=section('reverse','return','moderate',70);
  const grouped=groupTrafficSections([slow,reverse,heavy]);
  assert.equal(grouped.length,2);
  assert.equal(grouped[0].routeId,'outbound');
  assert.equal(grouped[0].sectionCount,2);
  assert.equal(grouped[0].affectedLengthMeters,600);
  assert.equal(grouped[0].sections[0].id,'jam');
  assert.equal(grouped[0].sections[0].path,heavy.path);
  assert.equal(grouped[0].sections[1].path,slow.path);
  assert.equal(grouped[0].path,undefined,'never connect separated sections through a clear gap');
  assert.equal(grouped[0].heavyCount,1);
  assert.equal(grouped[0].slowCount,1);
});
test('a grouped card preserves the oldest observation and flags stale sections', () => {
  const a=section('a','road','moderate',20),b={...section('b','road','heavy',30),isStale:true,lastUpdated:'2026-10-24T11:00:00Z'};
  const [group]=groupTrafficSections([a,b]);
  assert.equal(group.isStale,true);
  assert.equal(group.lastUpdated,b.lastUpdated);
  assert.deepEqual(groupTrafficSections([]),[]);
});
