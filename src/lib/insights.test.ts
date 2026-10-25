import { describe, expect, it } from "vitest";
import { aggregateInsights } from "./insights";
import { getDemoBoxOffice } from "./box-office-fixture";

const entry = (movieCd: string, movieNm: string, salesAmt: number, audiCnt: number) => ({ movieCd, movieNm, openDt: "2026-09-01", rank: 1, salesAmt, audiCnt, salesAcc: 999, audiAcc: 999 });
describe("insight aggregation", () => {
  it("uses daily observed values, groups by movie code, and excludes cumulative values", () => {
    const result = aggregateInsights([
      { date: "2026-09-07", status: "success", entries: [entry("1", "같은 제목", 100, 10), entry("2", "같은 제목", 30, 3)] },
      { date: "2026-09-08", status: "success", entries: [entry("1", "다른 표기", 80, 8)] },
    ]);
    expect(result.line.map((item) => item.sales)).toEqual([130, 80]);
    expect(result.topMovies[0]).toMatchObject({ movieCd: "1", sales: 180 });
    expect(result.totalAudience).toBe(21);
  });
  it("breaks the line and hides totals when a date is empty or failed", () => {
    const result = aggregateInsights([{ date: "2026-09-07", status: "success", entries: [entry("1", "영화", 100, 0)] }, { date: "2026-09-08", status: "empty", entries: [] }]);
    expect(result.isComplete).toBe(false);
    expect(result.line[1].sales).toBeNull();
    expect(result.topMovies).toEqual([]);
  });
  it("matches the hand-calculated fixture totals for 2026-09-07 and 2026-09-08", () => {
    const result = aggregateInsights([
      { date: "2026-09-07", status: "success", entries: getDemoBoxOffice("2026-09-07", "daily") },
      { date: "2026-09-08", status: "success", entries: getDemoBoxOffice("2026-09-08", "daily") },
    ]);
    expect(result.line.map((item) => item.sales)).toEqual([11_400_000, 11_625_000]);
    expect(result.totalAudience).toBe(2_229);
    expect(result.topMovies[0]).toMatchObject({ movieCd: "20260001", sales: 10_580_000 });
  });
});
