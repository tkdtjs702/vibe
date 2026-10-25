import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLiveBoxOffice,
  KobisSchemaError,
  KobisUpstreamError,
} from "./kobis";

const validEntry = {
  movieCd: "20260001",
  movieNm: "테스트 영화",
  rank: "1",
  openDt: "20260903",
  salesAmt: "5200000",
  audiCnt: "510",
  salesAcc: "31000000",
  audiAcc: "3050",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("KOBIS live client", () => {
  it("requests the daily endpoint and normalizes string values", async () => {
    vi.stubEnv("KOBIS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ boxOfficeResult: { dailyBoxOfficeList: [validEntry] } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const entries = await getLiveBoxOffice("2026-09-06", "daily");
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(requestUrl.pathname).toContain("searchDailyBoxOfficeList.json");
    expect(requestUrl.searchParams.get("targetDt")).toBe("20260906");
    expect(requestUrl.searchParams.get("itemPerPage")).toBe("10");
    expect(requestUrl.searchParams.has("weekGb")).toBe(false);
    expect(entries).toEqual([
      expect.objectContaining({
        movieCd: "20260001",
        rank: 1,
        openDt: "2026-09-03",
        salesAmt: 5_200_000,
      }),
    ]);
  });

  it("uses the weekly endpoint and weekend weekGb", async () => {
    vi.stubEnv("KOBIS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ boxOfficeResult: { weeklyBoxOfficeList: [validEntry] } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLiveBoxOffice("2026-09-06", "weekend");
    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(requestUrl.pathname).toContain("searchWeeklyBoxOfficeList.json");
    expect(requestUrl.searchParams.get("weekGb")).toBe("1");
  });

  it("rejects malformed entries and upstream failures", async () => {
    vi.stubEnv("KOBIS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              boxOfficeResult: {
                dailyBoxOfficeList: [{ ...validEntry, salesAmt: "not-a-number" }],
              },
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    );

    await expect(getLiveBoxOffice("2026-09-06", "daily")).rejects.toBeInstanceOf(
      KobisSchemaError,
    );
    await expect(getLiveBoxOffice("2026-09-06", "daily")).rejects.toBeInstanceOf(
      KobisUpstreamError,
    );
  });
});
