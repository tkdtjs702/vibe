import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDemoBoxOffice, isPeriodType } from "@/lib/box-office-fixture";
import {
  getLiveBoxOffice,
  KobisConfigurationError,
  KobisSchemaError,
  KobisTimeoutError,
  KobisUpstreamError,
} from "@/lib/kobis";
import { entriesMatch, readBoxOfficePeriod, saveBoxOfficePeriod, BoxOfficeStoreError } from "@/lib/box-office-store";
import { createSupabaseServerClient, SupabaseConfigurationError } from "@/lib/supabase-client";

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const errorResponse = (status: number, code: string, message = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.") =>
  NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const periodType = request.nextUrl.searchParams.get("periodType");
  const scenario = request.nextUrl.searchParams.get("scenario") ?? "normal";
  const dataMode = process.env.DATA_MODE ?? "demo";

  if (!date || !isValidDate(date) || !isPeriodType(periodType)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "날짜와 기간 유형을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  }

  if (dataMode === "live") {
    try {
      const client = createSupabaseServerClient();
      const cached = await readBoxOfficePeriod(client, periodType, date);
      if (cached && new Date(cached.expiresAt).getTime() > Date.now()) {
        return NextResponse.json({ data: { entries: cached.entries }, meta: { dataMode: "live", date, periodType, source: "cache", fetchedAt: cached.fetchedAt, isEmpty: cached.entries.length === 0 } });
      }
      const entries = await getLiveBoxOffice(date, periodType);
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + (entries.length === 0 ? 60 : 24 * 60) * 60_000);
      const applied = await saveBoxOfficePeriod(client, periodType, date, fetchedAt, expiresAt, entries);
      const stored = await readBoxOfficePeriod(client, periodType, date);
      if (!stored || (applied && !entriesMatch(entries, stored.entries))) {
        return errorResponse(503, "CACHE_WRITE_FAILED", "최신 데이터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      return NextResponse.json({
        data: { entries: stored.entries },
        meta: {
          dataMode: "live",
          date,
          periodType,
          source: applied ? "kobis" : "cache",
          fetchedAt: stored.fetchedAt,
          isEmpty: stored.entries.length === 0,
        },
      });
    } catch (error) {
      if (error instanceof SupabaseConfigurationError) {
        return errorResponse(503, "SUPABASE_NOT_CONFIGURED", "저장된 데이터를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (error instanceof BoxOfficeStoreError) {
        return errorResponse(503, "CACHE_READ_OR_WRITE_FAILED", "저장된 데이터를 확인하거나 최신 데이터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (error instanceof KobisConfigurationError) {
        return errorResponse(503, "KOBIS_NOT_CONFIGURED");
      }
      if (error instanceof KobisTimeoutError) {
        return errorResponse(504, "KOBIS_TIMEOUT");
      }
      if (error instanceof KobisSchemaError) {
        return errorResponse(502, "KOBIS_INVALID_RESPONSE");
      }
      if (error instanceof KobisUpstreamError) {
        return errorResponse(502, "KOBIS_UPSTREAM_ERROR");
      }
      return errorResponse(502, "KOBIS_UPSTREAM_ERROR");
    }
  }

  if (dataMode !== "demo") {
    return errorResponse(503, "INVALID_DATA_MODE");
  }

  if (scenario === "loading") {
    await wait(1_200);
  }

  if (scenario === "error") {
    return NextResponse.json(
      { message: "데모 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  const entries = getDemoBoxOffice(date, periodType);
  return NextResponse.json({
    data: { entries },
    meta: {
      dataMode: "demo",
      date,
      periodType,
      source: "fixture",
      fetchedAt: new Date().toISOString(),
      isEmpty: entries.length === 0,
    },
  });
}
