import {
  type BoxOfficeEntry,
  type PeriodType,
  normalizeBoxOfficeEntry,
} from "@/lib/box-office-fixture";

const KOBIS_BASE_URL =
  "https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice";
const REQUEST_TIMEOUT_MS = 8_000;
const ITEM_PER_PAGE = "10";

type KobisListKey = "dailyBoxOfficeList" | "weeklyBoxOfficeList";

type KobisResponse = {
  boxOfficeResult?: Partial<Record<KobisListKey, unknown>>;
};

export class KobisConfigurationError extends Error {}
export class KobisTimeoutError extends Error {}
export class KobisUpstreamError extends Error {}
export class KobisSchemaError extends Error {}

const endpointFor = (periodType: PeriodType) => {
  if (periodType === "daily") {
    return {
      path: "searchDailyBoxOfficeList.json",
      listKey: "dailyBoxOfficeList" as const,
      weekGb: null,
    };
  }

  return {
    path: "searchWeeklyBoxOfficeList.json",
    listKey: "weeklyBoxOfficeList" as const,
    weekGb: periodType === "weekly" ? "0" : "1",
  };
};

const asRawEntry = (value: unknown) => {
  if (!value || typeof value !== "object") {
    throw new KobisSchemaError("Invalid KOBIS entry");
  }

  const record = value as Record<string, unknown>;
  const fields = [
    "movieCd",
    "movieNm",
    "rank",
    "openDt",
    "salesAmt",
    "audiCnt",
    "salesAcc",
    "audiAcc",
  ] as const;

  const rawEntry = {} as Record<(typeof fields)[number], string>;
  for (const field of fields) {
    const fieldValue = record[field];
    if (typeof fieldValue !== "string") {
      throw new KobisSchemaError(`Invalid KOBIS ${field}`);
    }
    rawEntry[field] = fieldValue;
  }

  return rawEntry;
};

const parseEntries = (payload: unknown, listKey: KobisListKey): BoxOfficeEntry[] => {
  if (!payload || typeof payload !== "object") {
    throw new KobisSchemaError("Invalid KOBIS payload");
  }

  const list = (payload as KobisResponse).boxOfficeResult?.[listKey];
  if (!Array.isArray(list)) {
    throw new KobisSchemaError("Missing KOBIS box-office list");
  }

  try {
    return list.map(asRawEntry).map(normalizeBoxOfficeEntry);
  } catch (error) {
    if (error instanceof KobisSchemaError) {
      throw error;
    }
    throw new KobisSchemaError("Invalid KOBIS entry values");
  }
};

export async function getLiveBoxOffice(
  date: string,
  periodType: PeriodType,
): Promise<BoxOfficeEntry[]> {
  const key = process.env.KOBIS_API_KEY;
  if (!key) {
    throw new KobisConfigurationError("KOBIS_API_KEY is not configured");
  }

  const endpoint = endpointFor(periodType);
  const url = new URL(`${KOBIS_BASE_URL}/${endpoint.path}`);
  url.searchParams.set("key", key);
  url.searchParams.set("targetDt", date.replaceAll("-", ""));
  url.searchParams.set("itemPerPage", ITEM_PER_PAGE);
  if (endpoint.weekGb) {
    url.searchParams.set("weekGb", endpoint.weekGb);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new KobisUpstreamError("KOBIS request failed");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new KobisSchemaError("KOBIS response is not JSON");
    }

    return parseEntries(payload, endpoint.listKey);
  } catch (error) {
    if (error instanceof KobisUpstreamError || error instanceof KobisSchemaError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new KobisTimeoutError("KOBIS request timed out");
    }
    throw new KobisUpstreamError("KOBIS request failed");
  } finally {
    clearTimeout(timeout);
  }
}
