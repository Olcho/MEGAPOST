import content from "./content.json" with { type: "json" };
export const { events, actions, memories, ends } = content;
export type Action = (typeof actions)[number];
export type State = ReturnType<typeof fresh>;
export function fresh() {
  return {
    event: "E01",
    shift: 1,
    P: 0,
    A: 0,
    flags: [] as string[],
    memory: [] as string[],
    log: [] as { source: "self"; shift: number; id: string; scene: string }[],
    endings: [] as string[],
    result: "",
    gained: [] as string[],
  };
}
export const isEnd = (id: string) => Object.hasOwn(ends, id);
export function sceneKey(s: State) {
  const extra =
    s.event === "E03"
      ? String(s.memory.includes("W"))
      : s.event === "E01"
        ? String(s.shift > 1)
        : s.event === "E07"
          ? judgment(s)
          : "";
  return [
    s.event,
    extra,
    options(s)
      .map((a) => a.id)
      .join(","),
  ].join("/");
}
export function judgment(s: State) {
  return s.A >= 2
    ? "무인 인계 서류 인쇄 중"
    : s.P < 3
      ? "마감 미처리 건 확인 중"
      : "다음 교대 관제석 유지 검토";
}
export function allowed(s: State, a: Action) {
  return (
    s.event === a.event &&
    a.cond.split(" & ").every((term) => {
      if (term === "*") return true;
      if (term.startsWith("!")) return !s.flags.includes(term.slice(1));
      const test = /^([AP])(<|>=)(\d+)$/.exec(term);
      if (test) {
        const v = s[test[1] as "P" | "A"];
        return test[2] === "<" ? v < Number(test[3]) : v >= Number(test[3]);
      }
      return s.memory.includes(term) || s.flags.includes(term);
    })
  );
}
export function options(s: State) {
  return actions.filter((a) => allowed(s, a));
}
export function step(s: State, id: string): State {
  if (id === "@") {
    if (!isEnd(s.event)) throw Error("현재 근무가 진행 중입니다.");
    return {
      ...fresh(),
      shift: s.shift + 1,
      memory: s.memory,
      log: s.log,
      endings: s.endings,
    };
  }
  const a = actions.find((row) => row.id === id);
  if (!a || !allowed(s, a))
    throw Error("이 근무에서 실행할 수 없는 선택입니다.");
  const n = {
    ...s,
    event: a.to,
    memory: [...s.memory],
    flags: [...s.flags],
    gained: [] as string[],
    result: a.result,
    log: [
      ...s.log,
      { source: "self" as const, shift: s.shift, id, scene: sceneKey(s) },
    ],
  };
  for (const token of a.effect.split(" ")) {
    if (token === "-") continue;
    const delta = /^([PA])([+-]\d+)$/.exec(token);
    if (delta) {
      const key = delta[1] as "P" | "A";
      n[key] = Math.max(0, n[key] + Number(delta[2]));
      continue;
    }
    if (Object.hasOwn(memories, token)) {
      if (!n.memory.includes(token)) {
        n.memory.push(token);
        n.gained.push(token);
      }
    } else if (!n.flags.includes(token)) n.flags.push(token);
  }
  if (isEnd(n.event) && !n.endings.includes(n.event))
    n.endings = [...s.endings, n.event];
  return n;
}
export const scene = (id: string) => events[id as keyof typeof events];
export const memory = (id: string) => memories[id as keyof typeof memories];
export const ending = (id: string) => ends[id as keyof typeof ends];
