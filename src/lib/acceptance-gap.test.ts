import { describe, expect, it } from "vitest";
import { aggregateInsights } from "./insights";

describe("PRD AC 9 gap", () => {
  it.skip("provides all four required summary metrics", () => {
    const result = aggregateInsights([{ date: "2026-09-07", status: "success", entries: [{ movieCd: "1", movieNm: "영화", openDt: "2026-09-01", rank: 1, salesAmt: 100, audiCnt: 10, salesAcc: 100, audiAcc: 10 }] }]);
    expect(result).toMatchObject({ totalSales: 100, totalAudience: 10, averageSales: 100, averageAudience: 10 });
  });
});
