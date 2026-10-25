import { getLiveBoxOffice } from "../src/lib/kobis";
import { entriesMatch, readBoxOfficePeriod } from "../src/lib/box-office-store";
import { createSupabaseServerClient } from "../src/lib/supabase-client";
import { isPeriodType } from "../src/lib/box-office-fixture";

const values = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=", 2)));
const date = values.date;
const period = values.period ?? null;
async function main() {
  if (!date || !isPeriodType(period)) {
    console.error("사용법: npm run verify:data -- --date=YYYY-MM-DD --period=daily|weekly|weekend");
    process.exitCode = 1;
    return;
  }
  try {
    const client = createSupabaseServerClient();
    const stored = await readBoxOfficePeriod(client, period, date);
    if (!stored) {
      console.error("저장된 데이터가 없습니다.");
      process.exitCode = 2;
    } else {
      const fresh = await getLiveBoxOffice(date, period);
      if (!entriesMatch(stored.entries, fresh)) {
        console.error(`검증 실패: DB ${stored.entries.length}건과 KOBIS ${fresh.length}건이 다릅니다.`);
        process.exitCode = 1;
      } else {
        console.log(`검증 통과: ${stored.entries.length}건이 새 KOBIS 조회와 일치합니다.`);
      }
    }
  } catch {
    console.error("검증 실패: 비교하지 못했습니다.");
    process.exitCode = 1;
  }
}

void main();
