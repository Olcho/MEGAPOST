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
import { evePrompts, eveReply, eveScene } from "../../src/eve.ts";
import { terminalGuidance } from "../../src/terminalGuidance.ts";

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
  const variants = [s];
  if (s.event === "E04") variants.push(step(s, "eve:상점 일정 다시 잡을 수 있어?"));
  if (s.event === "E05") variants.push(step(s, "term:auth request photo"));
  if (s.event === "E02" && s.memory.includes("M1")) {
    const authorized = step(s, "term:auth request flight");
    variants.push(step(authorized, "term:logs D-204"));
  }
  if (s.event === "E14" && s.memory.includes("M4") && s.flags.includes("witness")) {
    const authorized = step(s, "term:auth request audit");
    variants.push(step(authorized, "term:inspect MP-S17"));
  }
  for (const v of variants) {
    const available = options(v);
    assert.ok(available.length);
    if (v.event === "E08") assert.equal(available.length, 1);
    for (const a of actions.filter(
      (a) => a.event === v.event && !available.includes(a),
    )) assert.throws(() => step(v, a.id));
    for (const a of available) {
      seen.add(a.id);
      visit(step(v, a.id), depth, [...trail, v.event]);
    }
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
  K5: 4,
});
assert.ok(seen.has("E04.d"), "EVE-coordinated pickup must be reachable");
assert.ok(seen.has("E05.d"), "Photo-auth choice must be reachable");
assert.ok(seen.has("E06.d"), "Rescheduled route must be reachable");
assert.equal(terminalGuidance(fresh()).length, 0, "No irrelevant terminal chores before the first dispatch");
assert.match(terminalGuidance({...fresh(), event:"E02", memory:["M1"]})[0]?.detail ?? "", /사고 기록|장애/);
const flightGranted = step(step({...fresh(),event:"E02",memory:["M1"]}, "term:search D-204"), "term:auth request flight");
assert.match(terminalGuidance(flightGranted)[0]?.detail ?? "", /좌표|비행기록/);
assert.match(terminalGuidance({...fresh(), event:"E05"})[0]?.detail ?? "", /사진 원본|51동/);
assert.equal(terminalGuidance({...fresh(), event:"E04"}).length, 0);
const flightTask = terminalGuidance({...fresh(), event:"E02", memory:["M1"]})[0];
assert.match(flightTask.title, /조회|권한/);
const flightLookup = step({...fresh(),event:"E02",memory:["M1"]}, "term:search D204");
assert.ok(flightLookup.flags.includes("lookedUpD204"), "Hyphen-insensitive search must record investigated target");
assert.match(terminalGuidance(flightLookup)[0]?.title ?? "", /권한/);
const flightAuthorized = step(flightLookup, "term:auth request flight");
assert.match(terminalGuidance(flightAuthorized)[0]?.title ?? "", /로그/);
const flightLogged = step(flightAuthorized, "term:logs D204");
assert.ok(flightLogged.flags.includes("terminalTrace"));
assert.match(terminalGuidance(flightLogged)[0]?.title ?? "", /완료/);
assert.ok(options(flightLogged).some(a => a.id === "E02.t"), "Verified flight trace must enable a new dispatch decision");
assert.match(step(fresh(), "term:logs").terminal.at(-1).text, /대상이 빠졌습니다/);
assert.match(step(fresh(), "term:search R-771").terminal.at(-1).text, /접수하지/);
assert.match(step(fresh(), "term:search xyz").terminal.at(-1).text, /검색 대상/);
assert.doesNotMatch(`${flightTask.title} ${flightTask.detail}`, /auth request|logs D-204|search D-204/i, "Guidance must describe intent without pasting commands");
assert.equal(terminalGuidance({...fresh(), event:"E03", flags:["north"]}).length, 0, "Do not send the player to terminal for a desk-only action");
assert.match(terminalGuidance({...fresh(), event:"E05", flags:["photoAuth"]})[0]?.detail ?? "", /증거로 남기|보존/);
assert.match(terminalGuidance({...fresh(), event:"E01", memory:["M4","M5"]})[0]?.title ?? "", /권한/);
assert.match(terminalGuidance({...fresh(), event:"E14", memory:["M4"], flags:["witness"]})[0]?.title ?? "", /권한/);
assert.match(events.E02.body, /수신원이 없는 신호/);
assert.match(events.E10.body, /겹쳐/);

const privateStaff = step(fresh(), "term:staff lookup MP-H07");
assert.match(privateStaff.terminal.at(-1).text, /AUTH 403/);
assert.doesNotMatch(privateStaff.terminal.at(-1).text, /인간형 자율판단 로봇/);
const whoami = step(fresh(), "term:whoami");
assert.match(whoami.terminal.at(-1).text, /AUTH 403/);
const privateHelp = step(fresh(), "term:help");
assert.doesNotMatch(privateHelp.terminal.at(-1).text, /hint|가상 명령|실제 컴퓨터/);
assert.match(privateHelp.terminal.at(-1).text, /cls/);
assert.doesNotMatch(privateHelp.terminal.at(-1).text, /D-204|C-918|R-771|MP-S17|request flight|request audit/, "help must not reveal unreached IDs or solved commands");
const syntaxHelp = step(fresh(), "term:help search");
assert.match(syntaxHelp.terminal.at(-1).text, /search <장비 ID/);
// v8.1.1 regression coverage: discoverable help and permission names.
for (const topic of ["status", "help", "cls", "clear"]) {
  const reply = step(fresh(), `term:help ${topic}`).terminal.at(-1);
  assert.equal(reply.kind, "ok");
  assert.match(reply.text, topic === "status" ? /현재 근무 번호/ : /\[EVE\]/);
}
const photoIncident = {...fresh(), event:"E05"};
assert.match(terminalGuidance(photoIncident)[0].detail, /photo/);
assert.doesNotMatch(terminalGuidance(photoIncident)[0].detail, /auth request photo/);
assert.match(step(photoIncident, "term:auth").terminal.at(-1).text, /photo.*인수 사진 원본/);
assert.match(step(photoIncident, "term:search R-771").terminal.at(-1).text, /photo/);
for (const permission of ["photo", "image", "사진", "사진 원본"]) {
  const granted = step(photoIncident, `term:auth request ${permission}`);
  assert.ok(granted.flags.includes("photoAuth"));
  assert.ok(options(granted).some(a => a.id === "E05.d"));
}
assert.ok(!step(fresh(), "term:auth request image").flags.includes("photoAuth"));
const preserved = step(step(photoIncident, "term:auth request photo"), "E05.d");
const notice = preserved.terminal.at(-1).text;
assert.match(notice, /문서 ID: R771/);
assert.match(notice, /사진에 찍힌 동 번호-주문서의 동 번호/);
assert.match(notice, /추가 조사/);
assert.doesNotMatch(notice, /archive open R771|51-15/);
assert.ok(step(preserved, "term:archive open R771 51-15").secrets.includes("R771"));
const firstAccident = step(step(fresh(), "E01.a"), "E02.a");
assert.doesNotMatch(firstAccident.terminal.at(-1).text, /다음 교대|다음 근무|다음 회차/);
const authEarly = step(fresh(), "term:auth");
assert.doesNotMatch(authEarly.terminal.at(-1).text, /서울시|보안감사|MP-S17/);
const archiveEarly = step(fresh(), "term:archive index");
assert.doesNotMatch(archiveEarly.terminal.at(-1).text, /R771|D204|RELAY/);
// Hidden archive vocabulary becomes discoverable only with evidence; codes remain private.
assert.doesNotMatch(privateHelp.terminal.at(-1).text, /archive/);
assert.equal(step(fresh(), "term:help archive").terminal.at(-1).kind, "error");
for (const s of [preserved, flightLogged, {...fresh(), memory:["M4","M5"]}]) {
  assert.match(step(s,"term:help").terminal.at(-1).text,/archive/);
  const detail=step(s,"term:help archive").terminal.at(-1);
  assert.equal(detail.kind,"ok");
  assert.match(detail.text,/archive open <ID> <코드>/);
  assert.doesNotMatch(detail.text,/R771|D204|RELAY|51-15|08-12|07-58/);
}
const retainedFlight = step({...flightLogged,event:"F1"}, "@");
assert.match(step(retainedFlight,"term:help").terminal.at(-1).text,/archive/);
assert.ok(step(retainedFlight,"term:archive open D204 08-12").secrets.includes("D204"));
assert.doesNotMatch(step(retainedFlight,"term:archive index").terminal.at(-1).text,/R771|RELAY/);
// Ending chat never leaks into active dispatch advice or grants permissions.
assert.equal(evePrompts(fresh()),null);
const distinctReviews = new Set();
for (const event of outcomes) {
  const ended={...fresh(),event};
  const prompts=evePrompts(ended);
  assert.equal(prompts.length,3);
  assert.ok(!prompts.some(p=>/터미널|현재 상황|농담/.test(p)));
  distinctReviews.add(eveReply(ended,prompts[0]).text);
  for (const prompt of [...prompts,"현재 상황","터미널에서 뭘 확인하지?","상점 일정 다시 잡을 수 있어?","다음에는 어떻게 해야 해?","농담 좀 해봐"]) {
    const reply=eveReply(ended,prompt);
    assert.ok(reply.text.length>0 && !reply.grant);
    assert.doesNotMatch(reply.text,/관제 화면|다음 (교대|근무|회차)|search |auth request|K5|히든엔딩/);
    assert.equal(step(ended,`eve:${prompt}`).event,event);
  }
  assert.doesNotMatch(eveScene(ended),/다음엔|다음 교대|끊기 전에/);
}
assert.equal(distinctReviews.size,outcomes.length);
const terminalCleared = step(privateHelp, "term:cls");
assert.deepEqual(terminalCleared.terminal, []);
assert.deepEqual(replay({ ...empty(), commands: ["term:help", "term:cls"] }).terminal, []);
const noHint = step(fresh(), "term:hint");
assert.match(noHint.terminal.at(-1).text, /명령을 찾을 수 없습니다/);
let talks = step(fresh(), "E01.a");
talks = step(talks, "E02.a");
talks = step(talks, "E03.a");
talks = step(talks, "eve:상점 일정 다시 잡을 수 있어?");
assert.ok(talks.flags.includes("eveCoord"));
assert.ok(options(talks).some(a => a.id === "E04.d"));
talks = step(talks, "E04.d");
talks = step(talks, "E05.b");
assert.ok(options(talks).some(a => a.id === "E06.d"));
talks = step(talks, "E06.d");
assert.ok(talks.memory.includes("M2"));
assert.ok(talks.eveChat.some(l => l.role === "operator"));
const afterClearReplay = replay({...empty(), commands: ["E01.a","E02.a","E03.a","eve:상점 일정 다시 잡을 수 있어?","E04.d","E05.b","E06.d"]});
assert.deepEqual(afterClearReplay, talks);
const secretR = step(talks,"term:archive open R771 51-15");
assert.ok(secretR.secrets.includes("R771"));
assert.deepEqual(step(step(secretR,"E11.a"),"@").secrets,secretR.secrets);
assert.ok(profiles.some((p) => p.length === Object.keys(memories).length));
const route = (s, ids) => ids.split(" ").reduce(step, s);
const auto = "E01.a E02.a E03.b E04.a E05.b E06.a E07.a E08.a";
const fail = route(fresh(), auto);
assert.equal(fail.event, "F1");
const next = step(fail, "@");
assert.deepEqual([next.P, next.A, ...next.flags], [0, 0]);
assert.deepEqual(next.memory, fail.memory);
assert.deepEqual(fail.terminal, [], "Terminal output clears when the shift ends");
assert.deepEqual(next.terminal, [], "Terminal output stays blank after restart");
const withTerminal = route(fresh(), "E01.a E02.a E03.b E04.a E05.b E06.a E07.a");
const withOutput = step(withTerminal, "term:status");
assert.ok(withOutput.terminal.length > 0);
const endedTerminal = step(withOutput, "E08.a");
assert.deepEqual(endedTerminal.terminal, [], "End screen must not show the prior terminal session");
const restarted = step(endedTerminal, "@");
assert.deepEqual(restarted.terminal, []);
assert.deepEqual(restarted.memory, endedTerminal.memory);
const replayedRestart = replay({...empty(), commands:[..."E01.a E02.a E03.b E04.a E05.b E06.a E07.a".split(" "),"term:status","E08.a","@"]});
assert.deepEqual(replayedRestart.terminal, []);
assert.deepEqual(replayedRestart.memory, restarted.memory);
assert.throws(() => route(fresh(), "E01.b"));
assert.throws(() => step(fail, "E08.a"));
assert.throws(
  () => decode('{"version":1,"rev":"x","commands":["E01.a"]}'),
  /HUMAN FIRST/,
);
assert.throws(() => decode('{"version":2,"rev":"x","commands":["E12.d"]}'), /이전 MEGAPOST/);
assert.throws(() => decode('{"version":3,"rev":"x","commands":["E12.d"]}'), /이전 개편판/);
assert.throws(() => decode('{"version":4,"rev":"x","commands":["E12.d"]}'));
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
let hidden = step(informed, "@");
hidden = route(hidden, "E01.b E13.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.d");
assert.equal(hidden.event, "E14");
assert.equal(options(hidden).some((a) => a.id === "E14.c"), false);
hidden = step(hidden, "term:auth request audit");
hidden = step(hidden, "term:inspect MP-S17");
assert.ok(options(hidden).some((a) => a.id === "E14.c"));
hidden = route(hidden, "E14.c E15.b E16.b");
assert.equal(hidden.event, "K5");
assert.ok(hidden.memory.includes("M6"));
assert.deepEqual(hidden.terminal, [], "Terminal output must clear at the ending");
const restored = replay({ ...empty(), commands: [
  ..."E01.a E02.a E03.b E04.a E05.b E06.a E07.a E08.a".split(" "), "@",
  "E01.a", "term:auth request flight", "term:logs D-204", "E02.t",
] });
assert.ok(restored.flags.includes("trace"));
assert.equal(restored.terminal.some((m) => m.command === "logs D-204"), true);
assert.equal(restored.event, "E03");
assert.equal(step(fresh(), "term:auth request audit").flags.includes("auditAuth"), false);
const corporate = route(
  { ...fresh(), memory: ["M1", "M2", "M3", "M4", "M5"] },
  "E01.b E13.a E02.d E10.a E03.a E04.b E05.b E06.b E11.c E12.d E14.a",
);
assert.equal(corporate.event, "K4");
assert.equal(corporate.memory.includes("M6"), false);
const secretRelay = step(corporate, "term:archive open RELAY 07-58");
assert.ok(secretRelay.secrets.includes("RELAY"));
assert.equal(step(fresh(), "term:archive open RELAY 07-58").secrets.length, 0);
let secretFlight = route({...fresh(),memory:["M1"]}, "E01.a E02.d E10.a");
secretFlight = step(secretFlight, "term:archive open D204 08-12");
assert.ok(secretFlight.secrets.includes("D204"));
assert.equal(step(fresh(), "term:archive open D204 08-12").secrets.length, 0);
const leaked = step(secretFlight, "term:staff lookup 한윤서");
assert.match(leaked.terminal.at(-1).text, /AUTH 403/);

// Identifying as a robot must never be visible as an available choice in the first run.
assert.equal(options(fresh()).some((a) => a.id.startsWith("E15")), false);
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
