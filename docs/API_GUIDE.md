# KOBIS Open API 연동 가이드 (A·B단계)

## 범위와 보안

이 문서는 KOBIS 일간·주간·주말 박스오피스 Open API를 내부 목록 API에 연결하는 A단계를 정의한다. A단계의 흐름은 **KOBIS 호출 → 응답 검증·정규화 → 내부 API 응답**이며, Supabase 저장과 캐시는 B단계에서 구현한다.

`KOBIS_API_KEY`는 `.env.local`의 서버 환경 변수로만 사용한다. 브라우저, Git, 응답 본문, 로그, 이 문서에는 키 값을 넣지 않는다. KOBIS는 일별과 주간/주말 박스오피스 서비스를 별도로 제공한다. [KOBIS Open API 서비스 목록](https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do), [일별 서비스 안내](https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do?serviceId=searchDailyBoxOffice), [주간/주말 서비스 안내](https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do?serviceId=searchWeeklyBoxOffice)를 기준으로 구현한다.

## 1. KOBIS 요청과 응답

| 내부 기간 유형 | KOBIS REST 경로 | 고정 요청 파라미터 | 추가 요청 파라미터 | 응답 목록 필드 |
| --- | --- | --- | --- | --- |
| `daily` | `/webservice/rest/boxoffice/searchDailyBoxOfficeList.json` | `key`, `targetDt`, `itemPerPage=10` | 없음 | `boxOfficeResult.dailyBoxOfficeList` |
| `weekly` | `/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json` | `key`, `targetDt`, `itemPerPage=10` | `weekGb=0` (주간, 월~일) | `boxOfficeResult.weeklyBoxOfficeList` |
| `weekend` | `/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json` | `key`, `targetDt`, `itemPerPage=10` | `weekGb=1` (주말, 금~일) | `boxOfficeResult.weeklyBoxOfficeList` |

| 파라미터 | 형식 | 처리 원칙 |
| --- | --- | --- |
| `key` | 서버 환경 변수 | `KOBIS_API_KEY`를 서버에서만 URL 검색 파라미터로 전달한다. 어떤 응답·로그에도 키를 다시 담지 않는다. |
| `targetDt` | `YYYYMMDD` | 내부 요청의 `date=YYYY-MM-DD`를 하이픈 없이 변환한다. 실재하지 않는 날짜는 외부 호출 전 거절한다. |
| `itemPerPage` | 양의 정수 | A단계는 화면의 기본 Top 10에 맞춰 `10`으로 고정한다. |
| `weekGb` | `0` 또는 `1` | 일간에는 보내지 않는다. `0`은 주간, `1`은 주말로 매핑한다. |

KOBIS 응답은 `boxOfficeResult` 아래 일간 또는 주간 목록을 반환한다. 이 서비스의 수치 필드는 숫자처럼 보여도 문자열로 전달될 수 있으므로 문자열 비교·정렬·저장을 금지한다.

## 2. KOBIS 필드와 ERD 매핑

| KOBIS 필드 | 수신 형식 | 정규화 | ERD 저장 대상(B단계) | A단계 내부 응답 |
| --- | --- | --- | --- | --- |
| `movieCd` | 문자열 | 빈 문자열을 거절하고 문자열 식별자로 보존 | `movies.movie_cd` | `movieCd: string` |
| `movieNm` | 문자열 | 공백 제거 후 빈 값을 거절 | `movies.movie_nm` | `movieNm: string` |
| `openDt` | `YYYYMMDD` 문자열(빈 값 가능) | 유효한 날짜만 `YYYY-MM-DD`로 변환; 빈 값은 빈 문자열로 유지 | `movies.open_dt` (`date`, NULL 가능) | `openDt: string` |
| `rank` | 숫자 문자열 | 안전한 정수로 변환, 1 이상 | `period_performances.rank` | `rank: number` |
| `salesAmt` | 숫자 문자열 | 안전한 정수로 변환, 0 이상 | `period_performances.sales_amt` | `salesAmt: number` |
| `audiCnt` | 숫자 문자열 | 안전한 정수로 변환, 0 이상 | `period_performances.audi_cnt` | `audiCnt: number` |
| `salesAcc` | 숫자 문자열 | 안전한 정수로 변환, 0 이상 | `period_performances.sales_acc` | `salesAcc: number` |
| `audiAcc` | 숫자 문자열 | 안전한 정수로 변환, 0 이상 | `period_performances.audi_acc` | `audiAcc: number` |

`movieCd`는 숫자 계산값이 아닌 식별자이므로 `Number()`로 바꾸지 않는다. B단계에서는 영화 정보는 `movies`, 조회 조건은 `query_periods`, 기간별 수치는 `period_performances`에 저장한다.

## 3. 내부 API 계약과 오류 정책

`GET /api/box-office?date=YYYY-MM-DD&periodType=daily|weekly|weekend`

성공 시에는 `200`과 `{ data: { entries }, meta }`를 반환한다. `meta`에는 `dataMode`, `date`, `periodType`, `source`, `fetchedAt`, `isEmpty`가 들어간다. live 성공의 `source`는 `kobis`, demo 성공의 `source`는 `fixture`다.

| 조건 | HTTP | 내부 오류 코드 | 외부 노출 문구 |
| --- | ---: | --- | --- |
| 날짜·기간 유형이 없거나 형식/실재 날짜가 아님 | 400 | `INVALID_REQUEST` | 날짜와 기간 유형을 확인해 주세요. |
| `DATA_MODE`가 허용 값이 아님 | 503 | `INVALID_DATA_MODE` | 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. |
| live인데 키가 설정되지 않음 | 503 | `KOBIS_NOT_CONFIGURED` | 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. |
| KOBIS가 비성공 HTTP·네트워크 오류를 반환 | 502 | `KOBIS_UPSTREAM_ERROR` | 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. |
| KOBIS 응답이 JSON이 아니거나 목록/필드 형식이 맞지 않음 | 502 | `KOBIS_INVALID_RESPONSE` | 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. |
| KOBIS 호출이 8초 안에 끝나지 않음 | 504 | `KOBIS_TIMEOUT` | 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. |
| KOBIS가 유효한 빈 목록을 반환 | 200 | 해당 없음 | 정상 빈 결과 안내를 표시한다. |

상세 원인, 외부 URL, 키, 응답 원문은 API 응답과 화면에 노출하지 않는다.

## 4. 저장 전 검증

1. 요청값: `date`가 정확한 ISO 날짜인지, `periodType`이 `daily`·`weekly`·`weekend` 중 하나인지 확인한다.
2. 최상위 구조: JSON 객체의 `boxOfficeResult`와 기간 유형에 맞는 목록 배열이 존재하는지 확인한다.
3. 필수 문자열: `movieCd`, `movieNm`, `rank`, `salesAmt`, `audiCnt`, `salesAcc`, `audiAcc`가 문자열인지 확인한다. `movieCd`, `movieNm`은 공백만 있는 값을 거절한다.
4. 날짜: `openDt`는 빈 문자열 또는 실제 달력상 존재하는 `YYYYMMDD`여야 한다. 통과한 값만 `YYYY-MM-DD`로 변환한다.
5. 수치: 수치 문자열은 숫자 문자만 허용하고, `Number.isSafeInteger` 범위 안인지 확인한다. `rank`는 1 이상, 매출·관객·누적값은 0 이상이어야 한다.
6. 원자성: 하나라도 검증에 실패하면 부분 정규화·부분 저장·성공 응답을 만들지 않고 `KOBIS_INVALID_RESPONSE`으로 종료한다. A단계에는 저장 동작 자체가 없다.

## 5. DATA_MODE 확인 기준

| 모드 | 기대 결과 | 확인 방법 |
| --- | --- | --- |
| `DATA_MODE=demo` | fixture만 반환하며 KOBIS를 호출하지 않는다. `2026-09-06`은 정상 빈 결과, `바다` 검색은 결과 있음, 없는 제목은 검색 결과 없음이다. | `.env.local`에서 `DATA_MODE=demo`로 실행한 뒤 F1 화면 또는 내부 API를 확인한다. |
| `DATA_MODE=live` | 서버가 KOBIS를 호출하고 검증된 실제 데이터를 반환한다. `2026-09-06` 일간 조회는 실제 데이터가 있으므로 정상 빈 결과가 아니어야 한다. | `.env.local`에 키를 설정한 뒤 개발 서버를 재시작하고 `GET /api/box-office?date=2026-09-06&periodType=daily`가 `200`, `meta.source: kobis`, `data.entries.length > 0`인지 확인한다. |

키가 설정되지 않은 환경에서는 live 실조회가 불가능하므로, 키가 설정된 서버 환경에서만 마지막 행의 검증을 실행한다.

## 6. B단계: Supabase 저장과 캐시

저장·읽기는 브라우저가 아닌 Next.js 서버가 Supabase RPC로 호출한다. 서버는 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 `.env.local`에서만 읽는다. 마이그레이션은 `supabase/migrations/202610250001_box_office_cache.sql`에 있다.

| 구성 | 쉬운 설명 |
| --- | --- |
| 테이블 | `movies`에는 영화 자체 정보, `query_periods`에는 날짜·기간과 수집/만료 시각, `period_performances`에는 그 기간의 순위·매출·관객수를 저장한다. ERD 외 테이블·컬럼은 만들지 않는다. |
| 보안 설정 | 세 테이블에 RLS를 켜고 브라우저 역할에는 정책·함수 실행 권한을 주지 않는다. 서버의 secret key 역할만 함수를 실행한다. |
| `save_box_office_period` | 한 DB 트랜잭션에서 영화 → 기간 → 실적 순서로 저장한다. 같은 기간은 advisory lock으로 직렬화하고, 더 오래된 `fetched_at` 요청은 무시한다. 새 결과를 적용할 때 해당 기간의 기존 실적을 먼저 전부 지워 Top 10에서 빠진 영화가 남지 않게 한다. 실패하면 트랜잭션 전체가 취소된다. |
| `read_box_office_period` | 기간 종류와 기준일로 기간 메타데이터와 실적을 순위 순서로 읽는다. 빈 정상 결과도 기간 행으로 읽을 수 있다. |

### 캐시 정책과 사용자 안내

| 상황 | 서버 동작 | HTTP/출처 | 화면 안내 |
| --- | --- | --- | --- |
| 유효한 정상 결과 | DB 읽기 후 바로 반환 | `200`, `meta.source: cache`, 24시간 | 표 상단에 “Supabase 캐시” 출처를 표시 |
| 유효한 정상 빈 결과 | DB 읽기 후 바로 반환 | `200`, `meta.source: cache`, 1시간 | 기존의 정상 빈 결과 안내(오류 아님) |
| 미스/만료 | KOBIS 조회 → 저장 함수 → DB 재읽기·대조 | `200`, 새 저장이면 `kobis`, 늦은 요청이면 `cache` | 표 상단 출처 표시 |
| 저장소 읽기 실패 | KOBIS를 호출하지 않고 종료 | `503`, `CACHE_READ_OR_WRITE_FAILED` | “저장된 데이터를 확인하거나 최신 데이터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.” |
| 저장 실패/저장 후 대조 불일치 | 성공 응답을 만들지 않고 종료 | `503`, `CACHE_WRITE_FAILED` | “최신 데이터를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.” |
| KOBIS 실패/지연 | DB 수정 없이 기존 A단계 오류 정책 적용 | `502`/`504` | “데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.” |

### `verify:data`

`npm run verify:data -- --date=YYYY-MM-DD --period=daily`는 DB를 **읽기만** 하고 새 KOBIS 조회와 비교한다. ERD를 그대로 유지한다는 결정에 따라 원본 JSON은 보관하지 않으므로, 비교 대상은 **DB 정규화 저장본 ↔ 새 KOBIS 정규화 결과**다.

- 종료 코드 `0`: 모든 항목이 일치
- 종료 코드 `1`: 다르거나 설정·DB·KOBIS 오류로 비교하지 못함
- 종료 코드 `2`: 저장된 기간 데이터가 없음

### Supabase 준비 순서

1. Supabase에서 프로젝트를 만든다.
2. SQL Editor에서 migration 파일 전체를 실행한다.
3. 프로젝트 URL과 서버 전용 secret key를 `.env.local`의 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`에 설정한다. 실제 값은 Git·브라우저·로그에 넣지 않는다.
4. 개발 서버를 재시작한 뒤 `DATA_MODE=live`로 목록 API를 호출한다.
5. 같은 날짜·기간을 두 번 조회한다. 첫 응답은 `meta.source: kobis`, 두 번째 응답은 `meta.source: cache`이면 통과다. 그 다음 `verify:data`를 실행한다.

Supabase Database Function은 서버에서 `rpc()`로 호출하도록 설계했다. `security definer` 함수는 호출 권한과 고정된 `search_path`를 함께 설정해야 하므로, migration은 `PUBLIC`·`anon`·`authenticated`의 실행 권한을 제거하고 `service_role`에만 부여한다. 자세한 보안·RPC 동작은 [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc)를 참고한다.
