import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  ...(process.env.HF_BROWSER ? { executablePath: process.env.HF_BROWSER } : {}),
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
  });
  const faults = [];
  page.on("pageerror", (e) => faults.push(e.message));
  const oldSave = '{"version":1,"rev":"human-first","commands":["E01.a"]}';
  await page.addInitScript((legacy) => {
    if (!localStorage.getItem("human-first.casefile.v1"))
      localStorage.setItem("human-first.casefile.v1", legacy);
  }, oldSave);
  await page.goto(process.env.HF_URL || "http://127.0.0.1:5173");
  if (process.env.HF_CAPTURE)
    await page.screenshot({ path: process.env.HF_CAPTURE });
  async function route(ids) {
    for (const id of ids.split(" "))
      await page.locator('[data-action="' + id + '"]').click();
  }
  const outcome = async (name) => {
    await page.getByRole("heading", { name, exact: true }).waitFor();
  };
  async function openLibrary(target, section) {
    await target.getByRole("button", { name: section, exact: true }).click();
  }
  const restart = () =>
    page.getByRole("button", { name: "다시 출근", exact: true }).click();
  const saved = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("megapost.dispatch.v4")),
    );
  const navHeight = async () => page.locator("nav").evaluate((el) => Math.round(el.getBoundingClientRect().height));
  const initialNavHeight = await navHeight();
  await page.getByRole("button", { name: "터미널", exact: true }).click();
  assert.ok(Math.abs(await navHeight() - initialNavHeight) <= 2, "Sidebar height must not depend on tab content");
  await page.getByRole("button", { name: "기록 보관함", exact: true }).click();
  assert.ok(Math.abs(await navHeight() - initialNavHeight) <= 2, "Archive should use same sidebar height");
  await page.getByRole("button", { name: "배송 관제", exact: true }).click();
  assert.equal(await page.locator('[data-action="E01.b"]').count(), 0);
  await route("E01.a");
  await outcome("D-204 통신 두절");
  await page.getByText("냉장 화물을 08:40까지 신촌 진료소로 보냅니다.").waitFor();
  assert.equal(await page.locator('[data-action="E02.d"]').count(), 0);
  await page.getByRole("button", { name: "터미널", exact: true }).click();
  await page.locator("#terminal-command").fill("status");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  assert.equal(await page.locator(".terminal-command").count(), 1);
  await page.getByRole("button", { name: /배송관제로 돌아가기/ }).click();
  await route("E02.a E03.b E04.a E05.b E06.a E07.a E08.a");
  await outcome("관제석 자동 전환");
  await page.getByText("업무를 너무 많이 자동화했습니다").waitFor();
  await page.getByRole("button", { name: "터미널", exact: true }).click();
  assert.equal(await page.locator(".terminal-command").count(), 0, "End screen must clear terminal output");
  await page.getByRole("button", { name: /배송관제로 돌아가기/ }).click();
  const before = await saved();
  await page.reload();
  await outcome("관제석 자동 전환");
  assert.deepEqual(await saved(), before);
  await restart();
  await page.getByRole("button", { name: "터미널" }).click();
  await page.locator("#terminal-command").fill("help");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByText("MEGAPOST 관제 명령", {exact:false}).waitFor();
  await page.locator("#terminal-command").fill("staff lookup MP-H07");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByText("AUTH 403 / 직원 사번", {exact:false}).waitFor();
  await page.locator("#terminal-command").fill("cls");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  assert.equal(await page.locator(".terminal-line").count(), 0);
  await page.getByRole("button", { name: "배송 관제" }).click();
  await route("E01.a");
  await page.getByRole("button", { name: "터미널" }).click();
  await page.getByText("D-204의 이전 사고를 조회하세요", {exact:true}).waitFor();
  await page.locator("#terminal-command").fill("search D204");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByText("이전 사고를 찾았습니다", {exact:true}).waitFor();
  await page.getByText("비행기록 열람 권한을 확보하세요", {exact:true}).waitFor();
  await page.locator("#terminal-command").fill("auth request flight");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByText("비행기록 열람 가능", { exact: true }).waitFor();
  await page.locator("#terminal-command").fill("logs D204");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByText("안전한 우회 경로 발견", { exact: true }).waitFor();
  await page.getByRole("button", { name: "변경된 배송관제 확인" }).click();
  assert.equal(await page.locator('[data-action="E02.t"]').count(), 1);
  await page.getByText("비행기록에서 강변 우회로를 확인했습니다.").waitFor();
  await page.reload();
  assert.equal(await page.locator('[data-action="E02.t"]').count(), 1);
  await page.setViewportSize({ width: 360, height: 780 });
  const fits = async () => {
    const over = await page.evaluate(() =>
      Array.from(document.querySelectorAll("body *"))
        .filter(
          (el) =>
            el.getBoundingClientRect().right > innerWidth + 1 &&
            getComputedStyle(el).position !== "absolute",
        )
        .map((el) => [
          el.tagName,
          el.className,
          Math.round(el.getBoundingClientRect().right),
        ]),
    );
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    ) {
      console.log("overflow", over);
      return false;
    }
    return true;
  };
  assert.ok(await fits(), "mobile gate overflow");
  await route("E02.d E10.a E03.c E04.b E05.b E06.b E11.a");
  await outcome("중복 출고로 권한 정지");
  assert.ok(await fits(), "mobile notice overflow");
  await restart();
  const start = "E01.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c";
  await route(start + " E12.b");
  await outcome("시 안전센터 접수");
  await page.getByText("근무 종료 · 부분 성공", { exact: true }).waitFor();
  await restart();
  await route(start + " E12.c");
  await outcome("관제 분리 실패");
  await restart();
  await route(
    "E01.b E13.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.d E14.b",
  );
  await outcome("마지막 교대");
  await page.getByText("진엔딩", { exact: true }).waitFor();
  await restart();
  await route("E01.b E13.a E02.d E10.a E03.c E04.b E05.b E06.b E11.c E12.d");
  assert.equal(await page.locator('[data-action="E14.c"]').count(), 0);
  await page.getByRole("button", { name: "터미널" }).click();
  await page.locator("#terminal-command").fill("auth request audit");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.locator("#terminal-command").fill("inspect MP-S17");
  await page.getByRole("button", { name: "실행", exact: true }).click();
  await page.getByRole("button", { name: "배송 관제" }).click();
  await route("E14.c E15.b E16.b");
  await outcome("등록되지 않은 사람");
  await page.getByText("히든엔딩", { exact: true }).waitFor();
  await openLibrary(page, "기록 보관함");
  await outcome("기록 보관함");
  await page
    .getByRole("heading", { name: "윤서가 남긴 회선 복구 기록" })
    .waitFor();
  await openLibrary(page, "설정");
  const data = await saved();
  const dl = page.waitForEvent("download");
  await page.getByText("저장 파일 내려받기").click();
  const backup = await dl;
  page.on("dialog", (dlg) => dlg.accept());
  await page.getByText("전체 초기화").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("human-first.casefile.v1")),
    oldSave,
  );
  await page.locator('[data-action="E01.a"]').waitFor();
  await openLibrary(page, "설정");
  await page.locator("input[type=file]").setInputFiles(await backup.path());
  await outcome("등록되지 않은 사람");
  assert.deepEqual((await saved()).commands, data.commands);
  await page.reload();
  await outcome("등록되지 않은 사람");
  assert.deepEqual(faults, []);
  // A second blank profile can survive its first shift; knowledge is independent of the first dismissal.
  const separate = await browser.newContext();
  const other = await separate.newPage();
  await other.goto(process.env.HF_URL || "http://127.0.0.1:5173");
  for (const id of "E01.a E02.a E03.a E04.c E05.b E06.b E11.b E07.a E08.c E09.a".split(
    " ",
  ))
    await other.locator('[data-action="' + id + '"]').click();
  await other
    .getByRole("heading", { name: "다음 교대 근무", exact: true })
    .waitFor();
  await other.getByRole("button", { name: "다시 출근", exact: true }).click();
  for (const id of "E01.a E02.e E03.a E04.b E05.b E06.c E11.c".split(" "))
    await other.locator('[data-action="' + id + '"]').click();
  assert.equal(await other.locator('[data-action="E12.b"]').count(), 0);
  await other.locator('[data-action="E12.a"]').click();
  await other
    .getByRole("heading", { name: "진료소 인수 완료", exact: true })
    .waitFor();
  await separate.close();
  // UI integration: EVE dialogue unlocks a real option, and the photo original can be inspected.
  const interactiveContext = await browser.newContext();
  const interactive = await interactiveContext.newPage();
  await interactive.goto(process.env.HF_URL || "http://127.0.0.1:5173");
  for (const id of "E01.a E02.c E03.a".split(" "))
    await interactive.locator(`[data-action="${id}"]`).click();
  await interactive.getByRole("heading",{name:"기사의 휴식이 사라졌습니다"}).waitFor();
  assert.equal(await interactive.locator('[data-action="E04.d"]').count(),0);
  await interactive.locator("#eve-input").fill("상점 일정 다시 잡을 수 있어?");
  await interactive.getByRole("button",{name:"EVE 메시지 전송"}).click();
  await interactive.locator('[data-action="E04.d"]').waitFor();
  await interactive.locator('[data-action="E04.d"]').click();
  await interactive.getByRole("button",{name:"터미널",exact:true}).click();
  await interactive.locator("#terminal-command").fill("auth request photo");
  await interactive.getByRole("button",{name:"실행",exact:true}).click();
  await interactive.getByRole("button",{name:"배송 관제",exact:true}).click();
  await interactive.locator('[data-action="E05.d"]').waitFor();
  await interactive.locator('[data-action="E05.d"]').click();
  await interactive.locator('[data-action="E06.d"]').waitFor();
  await interactive.locator('[data-action="E06.d"]').click();
  await interactive.getByRole("button",{name:"터미널",exact:true}).click();
  await interactive.locator("#terminal-command").fill("archive open R771 51-15");
  await interactive.getByRole("button",{name:"실행",exact:true}).click();
  await interactive.getByText("서로 다른 근무일",{exact:false}).waitFor();
  await openLibrary(interactive, "기록 보관함");
  await interactive.getByText("회수되지 않은 프레임",{exact:false}).waitFor();
  await interactive.reload();
  await openLibrary(interactive, "기록 보관함");
  await interactive.getByText("회수되지 않은 프레임",{exact:false}).waitFor();
  await interactiveContext.close();
  console.log(
    "Desktop/mobile browser routes passed (v7 navigation, terminal help discovery, EVE): terminal auth/logs, F1 → F3 → K3 → F4 → K4 → K5, K1 → K2, archive, export/reset/import and preserved v1 save.",
  );
} finally {
  await browser.close();
}
