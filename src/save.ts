import { fresh, step } from "./engine.ts";
export const storageKey = "megapost.dispatch.v4";
export const previousKey = "megapost.dispatch.v3";
export const priorKey = "megapost.dispatch.v2";
export const legacyKey = "human-first.casefile.v1";
export type Save = { version: 4; rev: string; commands: string[] };
export const empty = (): Save => ({ version: 4, rev: "initial", commands: [] });
export function decode(raw: string): Save {
  const s = JSON.parse(raw);
  if (s?.version === 1)
    throw Error("HUMAN FIRST판 저장입니다. 기존 판에서 열어 주세요.");
  if (s?.version === 2)
    throw Error("이전 MEGAPOST 저장입니다. 기존 판에서 열거나 백업해 주세요.");
  if (s?.version === 3)
    throw Error("이전 개편판 v3 저장입니다. 기존 판에서 열거나 백업해 주세요.");
  if (
    s?.version !== 4 ||
    typeof s.rev !== "string" ||
    !Array.isArray(s.commands) ||
    s.commands.length > 50000
  )
    throw Error("지원하지 않는 저장 형식입니다.");
  replay(s);
  return { version: 4, rev: s.rev, commands: s.commands };
}
export function replay(s: Save) {
  return s.commands.reduce((state, id) => step(state, id), fresh());
}
export function read() {
  const raw = localStorage.getItem(storageKey);
  return raw === null ? empty() : decode(raw);
}
export async function commit(expected: string, commands: string[]) {
  async function write() {
    if (read().rev !== expected)
      throw Error("다른 창에서 진행했습니다. 새로고침해 최신 근무를 여세요.");
    const s: Save = { version: 4, rev: crypto.randomUUID(), commands };
    localStorage.setItem(storageKey, JSON.stringify(s));
    return s;
  }
  if (!navigator.locks)
    throw Error(
      "이 환경에서는 안전한 저장을 지원하지 않습니다. localhost 또는 HTTPS로 여세요.",
    );
  return navigator.locks.request(storageKey, write);
}
