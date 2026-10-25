import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type BoxOfficeEntry,
  type PeriodType,
  normalizeBoxOfficeEntry,
} from "@/lib/box-office-fixture";

export class BoxOfficeStoreError extends Error {}

export type StoredPeriod = {
  entries: BoxOfficeEntry[];
  fetchedAt: string;
  expiresAt: string;
  sourceStatus: "success" | "empty";
};

const stringifyField = (value: unknown, field: string) => {
  if (value === null || value === undefined) throw new BoxOfficeStoreError(`Missing ${field}`);
  return String(value);
};

export async function readBoxOfficePeriod(
  client: SupabaseClient,
  periodType: PeriodType,
  date: string,
): Promise<StoredPeriod | null> {
  const { data, error } = await client.rpc("read_box_office_period", {
    p_period_type: periodType,
    p_target_date: date,
  });
  if (error) throw new BoxOfficeStoreError("Could not read cached box-office data");
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  const first = rows[0];
  const sourceStatus = stringifyField(first.source_status, "source_status");
  if (sourceStatus !== "success" && sourceStatus !== "empty") throw new BoxOfficeStoreError("Invalid source status");
  const entries = rows[0].movie_cd === null
    ? []
    : rows.map((row) => normalizeBoxOfficeEntry({
        movieCd: stringifyField(row.movie_cd, "movie_cd"), movieNm: stringifyField(row.movie_nm, "movie_nm"),
        openDt: row.open_dt === null ? "" : String(row.open_dt), rank: stringifyField(row.rank, "rank"),
        salesAmt: stringifyField(row.sales_amt, "sales_amt"), audiCnt: stringifyField(row.audi_cnt, "audi_cnt"),
        salesAcc: stringifyField(row.sales_acc, "sales_acc"), audiAcc: stringifyField(row.audi_acc, "audi_acc"),
      }));
  return { entries, fetchedAt: stringifyField(first.fetched_at, "fetched_at"), expiresAt: stringifyField(first.expires_at, "expires_at"), sourceStatus };
}

export async function saveBoxOfficePeriod(
  client: SupabaseClient,
  periodType: PeriodType,
  date: string,
  fetchedAt: Date,
  expiresAt: Date,
  entries: BoxOfficeEntry[],
) {
  const { data, error } = await client.rpc("save_box_office_period", {
    p_period_type: periodType, p_target_date: date, p_fetched_at: fetchedAt.toISOString(),
    p_expires_at: expiresAt.toISOString(), p_source_status: entries.length === 0 ? "empty" : "success",
    p_entries: entries.map((entry) => ({
      movie_cd: entry.movieCd, movie_nm: entry.movieNm, open_dt: entry.openDt, rank: entry.rank,
      sales_amt: entry.salesAmt, audi_cnt: entry.audiCnt, sales_acc: entry.salesAcc, audi_acc: entry.audiAcc,
    })),
  });
  if (error) throw new BoxOfficeStoreError("Could not save box-office data");
  const result = (data ?? []) as { applied?: boolean }[];
  if (result.length !== 1 || typeof result[0].applied !== "boolean") throw new BoxOfficeStoreError("Invalid save result");
  return result[0].applied;
}

export const entriesMatch = (left: BoxOfficeEntry[], right: BoxOfficeEntry[]) =>
  JSON.stringify([...left].sort((a, b) => a.rank - b.rank)) === JSON.stringify([...right].sort((a, b) => a.rank - b.rank));
