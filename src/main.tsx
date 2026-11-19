import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { actions, ending, ends, memory, sceneKey, step, scene } from "./engine";
import {
  commit,
  decode,
  empty,
  legacyKey,
  read,
  replay,
  storageKey,
  type Save,
} from "./save";
import { DispatchDesk } from "./DispatchDesk";
import { files } from "./records";
import "./style.css";

const findAction = (id: string) => actions.find((action) => action.id === id)!;
const pad = (n: number) => String(n).padStart(2, "0");
const navigation = [
  ["desk", "▤", "배송 관제"],
  ["archive", "▥", "기록 보관함"],
  ["ends", "◈", "결과 도감"],
  ["settings", "⚙", "설정"],
] as const;

function App() {
  const [boot] = useState(() => {
    try {
      return { save: read(), err: "" };
    } catch {
      return {
        save: empty(),
        err: "저장 기록을 읽을 수 없습니다. 설정에서 기록을 내려받거나 초기화하세요.",
      };
    }
  });
  const [save, setSave] = useState<Save>(boot.save),
    [s, setState] = useState(() => replay(boot.save));
  const [tab, setTab] = useState("desk"),
    [error, setError] = useState(boot.err),
    [busy, setBusy] = useState(false);
  const [short, setShort] = useState(() => {
      try {
        return localStorage.getItem("megapost.compact") !== "off";
      } catch {
        return true;
      }
    }),
    [expanded, setExpanded] = useState(false);
  const lock = useRef(false),
    upload = useRef<HTMLInputElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const compact =
    short &&
    !expanded &&
    s.log.some((l) => l.shift < s.shift && l.scene === sceneKey(s));
  const collected = files.filter((f) => s.log.some((l) => l.id === f.id));
  useEffect(() => {
    const fn = (e: StorageEvent) => {
      if (e.key === storageKey) {
        try {
          const next = read();
          setSave(next);
          setState(replay(next));
          setExpanded(false);
        } catch {
          setError("다른 창의 저장을 읽을 수 없습니다.");
        }
      }
    };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, []);
  async function update(cmd: string | string[]) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const commands = typeof cmd === "string" ? [...save.commands, cmd] : cmd;
      const next =
        typeof cmd === "string" ? step(s, cmd) : replay({ ...save, commands });
      const written = await commit(save.rev, commands);
      setSave(written);
      setState(next);
      setError("");
      setExpanded(false);
      setTab("desk");
      requestAnimationFrame(() => {
        heading.current?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "저장 실패. 현재 화면에서 다시 시도하세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const [legacyAvailable] = useState(() => {
    try {
      return localStorage.getItem(legacyKey) !== null;
    } catch {
      return false;
    }
  });
  function download(key = storageKey) {
    try {
      const blob = new Blob(
        [localStorage.getItem(key) ?? JSON.stringify(save)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        key === legacyKey ? "human-first-v1.json" : "megapost-dispatch-v2.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("저장 파일에 접근할 수 없습니다.");
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <i className="mark" aria-hidden="true" />
          <b>MEGAPOST</b>
        </div>
        <span className="network">서울 서부 · 통합 배송관제팀</span>
        <div className="online">
          <i /> <span>관제망 접속</span>
        </div>
      </header>
      <div className="shell">
        <nav aria-label="관제 메뉴">
          {navigation.map(([key, icon, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
          <div className="operator">
            <b>신입 배송 운영 관리자</b>
            <span>마포 허브</span>
          </div>
        </nav>
        <main>
          <div className="location">
            <b>{navigation.find(([key]) => key === tab)?.[2]}</b>
            <span>
              서울 2080　·　근무 {pad(s.shift)}　
              {scene(s.event)?.time ?? "교대 종료"}
            </span>
          </div>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
          {tab === "desk" ? (
            <DispatchDesk
              state={s}
              busy={busy}
              compact={compact}
              heading={heading}
              advance={update}
              expand={() => setExpanded(true)}
            />
          ) : (
            <section className="panel">
              <h1>
                {tab === "archive"
                  ? "기록 보관함"
                  : tab === "ends"
                    ? "결과 도감"
                    : "단말 설정"}
              </h1>
              {tab === "archive" ? (
                <>
                  <h2>보존한 기억 · {s.memory.length}</h2>
                  {!s.memory.length && (
                    <p>근무에서 획득한 문서가 여기에 보관됩니다.</p>
                  )}
                  {s.memory.map((m) => (
                    <article key={m}>
                      <small>관제 기록</small>
                      <h3>{memory(m)[0]}</h3>
                      {memory(m)[1]}
                    </article>
                  ))}
                  <h2>선행 직원의 자료 · {collected.length}</h2>
                  {collected.map((f) => (
                    <article key={f.id}>
                      <h3>{f.name}</h3>
                      {f.body}
                    </article>
                  ))}
                  <h2>내 근무 기록</h2>
                  {Array.from(new Set(s.log.map((l) => l.shift)))
                    .reverse()
                    .map((n) => (
                      <details key={n}>
                        <summary>근무 {pad(n)} · 처리 이력</summary>
                        {s.log
                          .filter((l) => l.shift === n)
                          .map((l) => (
                            <p key={l.id}>
                              {findAction(l.id).label} —{" "}
                              {findAction(l.id).result}
                            </p>
                          ))}
                      </details>
                    ))}
                </>
              ) : tab === "ends" ? (
                <>
                  <p>
                    발견한 결과　{s.endings.length} / {Object.keys(ends).length}
                  </p>
                  {s.endings.map((id) => (
                    <article key={id}>
                      <small>
                        {id === "K4"
                          ? "진엔딩"
                          : id.startsWith("F")
                            ? "실패"
                            : "부분 성공"}{" "}
                        / {id}
                      </small>
                      <h3>{ending(id)[0]}</h3>
                      {ending(id)[1]}
                    </article>
                  ))}
                </>
              ) : (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={short}
                      onChange={(e) => {
                        setShort(e.target.checked);
                        try {
                          localStorage.setItem(
                            "megapost.compact",
                            e.target.checked ? "on" : "off",
                          );
                        } catch {
                          setError("설정 저장 실패");
                        }
                      }}
                    />{" "}
                    읽은 장면 요약
                  </label>
                  <h2>근무 데이터</h2>
                  <p>
                    이 브라우저에 자동 저장됩니다. 다른 기기에는 저장 파일을
                    가져가세요.
                  </p>
                  <button onClick={() => download()}>저장 파일 내려받기</button>
                  <button onClick={() => upload.current?.click()}>
                    저장 가져오기
                  </button>
                  {legacyAvailable && (
                    <button onClick={() => download(legacyKey)}>
                      기존 HUMAN FIRST 저장 내려받기
                    </button>
                  )}
                  <input
                    hidden
                    type="file"
                    accept=".json"
                    ref={upload}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        if (file.size > 2000000) throw Error();
                        const next = decode(await file.text());
                        if (confirm("현재 근무를 가져온 기록으로 교체할까요?"))
                          await update(next.commands);
                      } catch (e) {
                        setError(
                          e instanceof Error &&
                            e.message.includes("HUMAN FIRST")
                            ? e.message
                            : "유효한 MEGAPOST 저장 파일이 아닙니다.",
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (
                        confirm("MEGAPOST 근무 기록과 기억을 초기화할까요?")
                      ) {
                        if (boot.err) {
                          localStorage.removeItem(storageKey);
                          location.reload();
                        } else void update([]);
                      }
                    }}
                  >
                    전체 초기화
                  </button>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
