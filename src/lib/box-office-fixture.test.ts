import { describe, expect, it } from "vitest";
import {
  getDemoBoxOffice,
  normalizeBoxOfficeEntry,
} from "./box-office-fixture";

describe("box-office demo fixture", () => {
  it("returns normalized results for the sample period", () => {
    const entries = getDemoBoxOffice("2026-09-07", "daily");

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      movieCd: "20260001",
      movieNm: "바다의 노래",
      rank: 1,
    });
    expect(entries[0].salesAmt).toBeTypeOf("number");
    expect(entries[0].audiCnt).toBeTypeOf("number");
  });

  it("returns a normal empty result outside the sample period", () => {
    expect(getDemoBoxOffice("2026-09-06", "daily")).toEqual([]);
  });

  it("applies the selected period type to fixture metrics", () => {
    const daily = getDemoBoxOffice("2026-09-07", "daily")[0];
    const weekly = getDemoBoxOffice("2026-09-07", "weekly")[0];
    const weekend = getDemoBoxOffice("2026-09-07", "weekend")[0];

    expect(daily.movieCd).toBe("20260001");
    expect(weekly.salesAmt).toBe(daily.salesAmt * 7);
    expect(weekend.audiCnt).toBe(daily.audiCnt * 3);
  });

  it("rejects invalid numeric strings instead of coercing them", () => {
    expect(() =>
      normalizeBoxOfficeEntry({
        movieCd: "20260001",
        movieNm: "바다의 노래",
        rank: "1",
        openDt: "2026-09-03",
        salesAmt: "not-a-number",
        audiCnt: "100",
        salesAcc: "1000",
        audiAcc: "100",
      }),
    ).toThrow("Invalid salesAmt");
  });
});
