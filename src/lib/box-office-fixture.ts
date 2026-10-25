export const periodTypes = ["daily", "weekly", "weekend"] as const;

export type PeriodType = (typeof periodTypes)[number];

export type RawBoxOfficeEntry = {
  movieCd: string;
  movieNm: string;
  rank: string;
  openDt: string;
  salesAmt: string;
  audiCnt: string;
  salesAcc: string;
  audiAcc: string;
};

export type BoxOfficeEntry = {
  movieCd: string;
  movieNm: string;
  rank: number;
  openDt: string;
  salesAmt: number;
  audiCnt: number;
  salesAcc: number;
  audiAcc: number;
};

const DEMO_START = "2026-09-07";
const DEMO_END = "2026-09-13";

const toNonNegativeInteger = (value: string, field: string) => {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${field}`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${field}`);
  }

  return parsed;
};

export const normalizeBoxOfficeEntry = (entry: RawBoxOfficeEntry): BoxOfficeEntry => ({
  movieCd: entry.movieCd,
  movieNm: entry.movieNm,
  openDt: entry.openDt,
  rank: toNonNegativeInteger(entry.rank, "rank"),
  salesAmt: toNonNegativeInteger(entry.salesAmt, "salesAmt"),
  audiCnt: toNonNegativeInteger(entry.audiCnt, "audiCnt"),
  salesAcc: toNonNegativeInteger(entry.salesAcc, "salesAcc"),
  audiAcc: toNonNegativeInteger(entry.audiAcc, "audiAcc"),
});

const periodMultiplier: Record<PeriodType, number> = {
  daily: 1,
  weekly: 7,
  weekend: 3,
};

const daysFromStart = (date: string) => {
  const start = new Date(`${DEMO_START}T00:00:00Z`).getTime();
  const target = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((target - start) / 86_400_000);
};

const toRawEntry = (
  movieCd: string,
  movieNm: string,
  openDt: string,
  rank: number,
  salesAmt: number,
  audiCnt: number,
  salesAcc: number,
  audiAcc: number,
): RawBoxOfficeEntry => ({
  movieCd,
  movieNm,
  openDt,
  rank: String(rank),
  salesAmt: String(salesAmt),
  audiCnt: String(audiCnt),
  salesAcc: String(salesAcc),
  audiAcc: String(audiAcc),
});

export const getDemoBoxOffice = (date: string, periodType: PeriodType) => {
  if (date < DEMO_START || date > DEMO_END) {
    return [];
  }

  const days = daysFromStart(date);
  const multiplier = periodMultiplier[periodType];
  const rawEntries = [
    toRawEntry(
      "20260001",
      "바다의 노래",
      "2026-09-03",
      1,
      (5_200_000 + days * 180_000) * multiplier,
      (510 + days * 18) * multiplier,
      31_000_000 + days * 5_200_000,
      3_050 + days * 510,
    ),
    toRawEntry(
      "20260002",
      "달빛 역",
      "2026-09-05",
      2,
      (3_800_000 + days * 90_000) * multiplier,
      (365 + days * 9) * multiplier,
      14_200_000 + days * 3_800_000,
      1_360 + days * 365,
    ),
    toRawEntry(
      "20260003",
      "우리의 계절",
      "2026-08-27",
      3,
      (2_400_000 - days * 45_000) * multiplier,
      (228 - days * 4) * multiplier,
      42_600_000 + days * 2_400_000,
      4_080 + days * 228,
    ),
  ];

  return rawEntries.map(normalizeBoxOfficeEntry).sort((a, b) => a.rank - b.rank);
};

export const isPeriodType = (value: string | null): value is PeriodType =>
  value !== null && periodTypes.includes(value as PeriodType);
