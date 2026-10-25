import { NextRequest, NextResponse } from "next/server";
import { getDemoBoxOffice, isPeriodType } from "@/lib/box-office-fixture";

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const periodType = request.nextUrl.searchParams.get("periodType");
  const scenario = request.nextUrl.searchParams.get("scenario") ?? "normal";
  const dataMode = process.env.DATA_MODE ?? "demo";

  if (!date || !isPeriodType(periodType)) {
    return NextResponse.json(
      { message: "날짜와 기간 유형을 확인해 주세요." },
      { status: 400 },
    );
  }

  if (dataMode !== "demo") {
    return NextResponse.json(
      { message: "live 모드는 아직 준비되지 않았습니다." },
      { status: 501 },
    );
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

  return NextResponse.json({
    data: {
      entries: getDemoBoxOffice(date, periodType),
    },
    meta: {
      dataMode: "demo",
      date,
      periodType,
      source: "fixture",
      fetchedAt: new Date().toISOString(),
      isEmpty: getDemoBoxOffice(date, periodType).length === 0,
    },
  });
}
