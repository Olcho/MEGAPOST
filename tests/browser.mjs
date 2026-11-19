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
  const restart = () =>
    page.getByRole("button", { name: "다시 출근", exact: true }).click();
  const saved = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("megapost.dispatch.v2")),
    );
  assert.equal(await page.locator('[data-action="E01.b"]').count(), 0);
  await route("E01.a");
  await outcome("D-204 통신 두절");
  await page.getByText("냉장 모듈을 신촌 진료소로 보낸다.").waitFor();
  assert.equal(await page.locator('[data-action="E02.d"]').count(), 0);
  await route("E02.a E03.b E04.a E05.b E06.a E07.a E08.a");
  await outcome("관제석 자동 전환");
  const before = await saved();
  await page.reload();
  await outcome("관제석 자동 전환");
  assert.deepEqual(await saved(), before);
  await restart();
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
  await route("E01.a E02.d E10.a E03.c E04.b E05.b E06.b E11.a");
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
  await page.getByRole("button", { name: "기록 보관함" }).click();
  await outcome("기록 보관함");
  await page
    .getByRole("heading", { name: "윤서가 남긴 회선 복구 기록" })
    .waitFor();
  await page.getByRole("button", { name: "설정" }).click();
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
  await page.getByRole("button", { name: "설정" }).click();
  await page.locator("input[type=file]").setInputFiles(await backup.path());
  await outcome("마지막 교대");
  assert.deepEqual((await saved()).commands, data.commands);
  await page.reload();
  await outcome("마지막 교대");
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
  console.log(
    "Desktop/mobile browser routes passed: F1 → F3 → K3 → F4 → K4, K1 → K2, archive, export/reset/import and preserved v1 save.",
  );
} finally {
  await browser.close();
}
