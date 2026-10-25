import { expect, test } from "@playwright/test";

test("shows the dashboard start screen", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "영화 박스오피스 목록" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
  await expect(page.getByLabel("조회 메타정보")).toContainText("조회 3건");
  await expect(page.getByLabel("조회 메타정보")).toContainText(
    "출처: demo fixture",
  );
  await page.getByLabel("기간 유형").selectOption("weekly");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
});

test("shows normal empty, search empty, loading, and error states", async ({
  page,
}) => {
  await page.goto("/");

  const dateInput = page.getByLabel("조회 날짜");
  await dateInput.fill("2026-09-06");
  await dateInput.press("Tab");
  await expect(dateInput).toHaveValue("2026-09-06");
  await expect(
    page.getByText("선택한 날짜와 기간의 박스오피스 데이터가 없습니다. 다른 날짜 또는 기간을 선택해 보세요."),
  ).toBeVisible();
  await expect(
    page.getByText("정상적으로 조회되었지만 해당 기간의 데이터가 없는 결과입니다. 오류가 아닙니다."),
  ).toBeVisible();

  await dateInput.fill("2026-09-07");
  await dateInput.press("Tab");
  await expect(dateInput).toHaveValue("2026-09-07");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
  await page.getByLabel("영화명 검색").fill("없는 제목");
  await expect(page.getByText("“없는 제목”와 일치하는 영화가 없습니다.")).toBeVisible();

  await page.getByLabel("영화명 검색").fill("");
  await page.getByRole("button", { name: "로딩 상태 보기" }).click();
  await expect(page.getByText("데이터를 불러오는 중입니다.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();

  await page.getByRole("button", { name: "오류 상태 보기" }).click();
  await expect(
    page.getByText("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."),
  ).toBeVisible();
  await expect(
    page.getByText("오류 상태는 demo 화면에서만 재현한 것이며, 상세 오류는 표시하지 않습니다."),
  ).toBeVisible();
});

test("finds 바다 in the demo fixture and reports the filtered count", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();

  await page.getByLabel("영화명 검색").fill("바다");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
  await expect(page.getByLabel("조회 메타정보")).toContainText("조회 1건");
  await expect(page.getByLabel("조회 메타정보")).toContainText("전체 3건");
});

test("recovers from an empty search without showing an API error", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();

  await page.getByLabel("영화명 검색").fill("없는 제목");
  await expect(page.getByText("“없는 제목”와 일치하는 영화가 없습니다.")).toBeVisible();

  await page.getByRole("button", { name: "검색 초기화" }).click();
  await expect(page.getByRole("cell", { name: "바다의 노래" })).toBeVisible();
  await expect(
    page.getByText("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."),
  ).not.toBeVisible();
});
