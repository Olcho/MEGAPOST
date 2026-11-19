import assert from "node:assert/strict";
import {
  actions,
  ends,
  events,
  memories,
  fresh,
  options,
  step,
  isEnd,
} from "../../src/engine.ts";
import { decode, replay, empty } from "../../src/save.ts";

// Each profile represents the complete durable set of knowledge at the gate.
const profiles = [[]],
  depths = [1],
  known = new Set([""]),
  first = {},
  seen = new Set(),
  nodes = new Set();
const outcomes = Object.keys(ends);
assert.equal(new Set(actions.map((a) => a.id)).size, actions.length);
for (const a of actions) {
  assert.ok(Object.hasOwn(events, a.event), a.id);
  assert.ok(Object.hasOwn(events, a.to) || isEnd(a.to), a.id);
  assert.ok(
    a.hint && events[a.event].goal,
    "Missing decision context: " + a.id,
  );
}
function visit(s, depth, trail) {
  if (isEnd(s.event)) {
    first[s.event] ??= depth;
    const key = s.memory.slice().sort().join(",");
    if (!known.has(key)) {
      known.add(key);
      profiles.push([...s.memory]);
      depths.push(depth + 1);
    }
    return;
  }
  assert.ok(!trail.includes(s.event), "cycle: " + s.event);
  nodes.add(s.event);
  const available = options(s);
  assert.ok(available.length);
  if (s.event === "E08") assert.equal(available.length, 1);
  for (const a of actions.filter(
    (a) => a.event === s.event && !available.includes(a),
  )) {
    assert.throws(() => step(s, a.id));
  }
  for (const a of available) {
    seen.add(a.id);
    visit(step(s, a.id), depth, [...trail, s.event]);
  }
}
for (let i = 0; i < profiles.length; i++)
  visit({ ...fresh(), memory: profiles[i] }, depths[i], []);
assert.equal(nodes.size, Object.keys(events).length);
assert.equal(seen.size, actions.length);
assert.deepEqual(first, {
  F1: 1,
  F2: 1,
  F3: 1,
  K1: 1,
  K2: 2,
  K3: 2,
  F4: 3,
  K4: 4,
});
assert.ok(profiles.some((p) => p.length === Object.keys(memories).length));
const route = (s, ids) => ids.split(" ").reduce(step, s);
const auto = "E01.a E02.a E03.b E04.a E05.b E06.a E07.a E08.a";
const fail = route(fresh(), auto);
assert.equal(fail.event, "F1");
const next = step(fail, "@");
assert.deepEqual([next.P, next.A, ...next.flags], [0, 0]);
assert.deepEqual(next.memory, fail.memory);
assert.throws(() => route(fresh(), "E01.b"));
assert.throws(() => step(fail, "E08.a"));
assert.throws(
  () => decode('{"version":1,"rev":"x","commands":["E01.a"]}'),
  /HUMAN FIRST/,
);
assert.throws(() => decode('{"version":2,"rev":"x","commands":["E12.d"]}'));
assert.throws(() => decode('{"version":2}'));
assert.deepEqual(replay({ ...empty(), commands: auto.split(" ") }), fail);
assert.deepEqual(route(next, auto).memory, fail.memory);
const usedReserve = route(fresh(), "E01.a E02.c E03.a E04.c E05.b");
assert.throws(() => step(usedReserve, "E06.c"));
assert.ok(options(usedReserve).some((a) => a.id === "E06.b"));
const path = [
  "E01.a E02.a E03.b E04.a E05.b E06.a E07.a E08.a",
  "E01.a E02.d E10.a E03.c E04.b E05.b E06.b E11.a",
  "E01.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.b",
  "E01.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.c",
  "E01.b E13.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.d E14.b",
];
let informed = fresh();
const guided = path.map((p, i) => {
  informed = route(i ? step(informed, "@") : informed, p);
  return informed.event;
});
assert.deepEqual(guided, ["F1", "F3", "K3", "F4", "K4"]);
let seed = 18400;
function uniform(n) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((seed / 4294967296) * n);
}
const count = 10000,
  initialCounts = {},
  gain = Array(6).fill(0),
  ever = Object.fromEntries(outcomes.map((k) => [k, 0]));
for (let i = 0; i < count; i++) {
  let s = fresh();
  for (let d = 0; d < 6; d++) {
    const size = s.memory.length;
    while (!isEnd(s.event)) {
      const opts = options(s);
      s = step(s, opts[opts.length === 1 ? 0 : uniform(opts.length)].id);
    }
    if (!d) initialCounts[s.event] = (initialCounts[s.event] || 0) + 1;
    if (s.memory.length > size) gain[d]++;
    if (d === 5) s.endings.forEach((k) => ever[k]++);
    else s = step(s, "@");
  }
}
console.log(
  JSON.stringify(
    {
      nodes: nodes.size,
      actions: seen.size,
      profiles: profiles.length,
      first,
      guided,
      seed: 18400,
      count,
      initialCounts,
      gain,
      ever,
    },
    null,
    2,
  ),
);
