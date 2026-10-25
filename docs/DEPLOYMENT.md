# 배포 안내서

이 문서는 영화 박스오피스 인사이트 대시보드를 Vercel과 Supabase로 배포하는 절차를 정리한다. 확인일은 **2026-10-25 (KST)** 이다. 무료 플랜의 한도와 정책은 바뀔 수 있으므로 실제 배포 직전에 아래 공식 문서를 다시 확인한다.

## 1. 배포 구성과 무료 플랜 확인

| 서비스 | 용도 | 무료 조건 및 주요 제한 | 배포 전 확인 사항 | 공식 문서 |
| --- | --- | --- | --- | --- |
| Vercel Hobby | Next.js 앱 빌드·호스팅·내부 API 실행 | 무료이며 개인·비상업적 용도만 허용된다. 월 기준 Function 호출 100만 회, Function 실행 시간 100 GB-hours, Fast Data Transfer 100 GB가 포함된다. 기본 Function 최대 실행 시간은 10초이며 최대 60초로 설정 가능하다. 일일 배포는 100회, 배포당 빌드는 45분, 동시 빌드는 1개다. 한도를 넘으면 Hobby 배포가 일시 중지될 수 있다. | 공개 서비스가 상업적·고트래픽 용도라면 Hobby 대상이 아닌지 검토한다. KOBIS 호출의 서버 측 제한 시간이 Vercel Function 제한 안에 드는지 확인한다. | [Hobby 플랜](https://vercel.com/docs/plans/hobby), [플랫폼 한도](https://vercel.com/docs/limits), [플랜 개요](https://vercel.com/docs/plans) |
| Supabase Free | Postgres 캐시와 RPC 함수 | 무료 활성 프로젝트는 소유자/관리자 기준 총 2개까지다. 낮은 활동이 7일 이어진 프로젝트는 일시 정지될 수 있으며, 대시보드에서 최대 1년 동안 재개할 수 있다. 무료 프로젝트는 내려받을 수 있는 DB 백업을 제공하지 않는다. 사용량 한도 초과 뒤에는 서비스 제한이 적용될 수 있다. | 프로젝트 수·사용량·일시 정지 경고 메일을 확인한다. 운영 데이터에 별도 백업과 무중단이 필요하면 유료 플랜 또는 별도 백업 전략을 검토한다. | [요금·무료 프로젝트](https://supabase.com/docs/guides/platform/billing-on-supabase), [무료 프로젝트 일시 정지](https://supabase.com/docs/guides/platform/free-project-pausing), [운영 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod) |

Vercel의 환경변수는 프로젝트별·환경별로 관리하며, 변경값은 **새 배포에만** 적용된다. Node.js 런타임 환경변수의 총 크기는 배포당 64 KB 제한이다. 자세한 정책은 [Vercel 환경변수 문서](https://vercel.com/docs/environment-variables)를 따른다.

## 2. 실제 배포 절차

### 배포 전 준비

1. **[직접 수행]** GitHub, Vercel, Supabase 계정에 로그인하고 필요한 권한을 확인한다.
2. **[직접 수행]** Supabase 프로젝트를 열어 `supabase/migrations/202610250001_box_office_cache.sql` 전체를 SQL Editor에서 실행한다.
3. 로컬에서 아래 명령을 실행해 배포 전 회귀를 확인한다.

   ```powershell
   npm ci
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. **[직접 수행]** 변경 사항을 GitHub 원격 저장소의 배포 대상 브랜치(기본 `main`)에 푸시한다.

### Vercel 프로젝트 생성과 설정

1. **[직접 수행]** Vercel Dashboard에서 **Add New → Project**를 선택하고 GitHub 저장소 `tkdtjs702/vibe`를 Import한다.
2. Framework Preset이 **Next.js**로 감지되었는지 확인한다. Root Directory는 저장소 루트(`.`)를 사용한다.
3. Build Command는 `npm run build`, Install Command는 `npm ci`로 설정한다. `.node-version`의 Node.js `22.14.0`과 Vercel의 빌드 런타임 호환성을 확인한다.
4. **[직접 수행 — 민감 정보 등록]** Project Settings → Environment Variables에서 아래 이름을 등록한다. 값은 이 문서·소스 코드·Git에 기록하지 않는다.

   | 환경변수 이름 | Production | Preview | 용도 |
   | --- | --- | --- | --- |
   | `DATA_MODE` | `live` | 필요 시 `demo` 또는 별도 테스트 설정 | 데이터 소스 모드 |
   | `KOBIS_API_KEY` | 등록 | live Preview가 필요할 때만 등록 | KOBIS 서버 호출 |
   | `SUPABASE_URL` | 등록 | live Preview가 필요할 때만 등록 | Supabase 서버 연결 |
   | `SUPABASE_SECRET_KEY` | 등록 | live Preview가 필요할 때만 등록 | Supabase 서버 관리 권한 연결 |

   Preview에 실제 운영 키를 넣지 않아도 된다. Preview에서 `DATA_MODE=demo`를 사용하면 키 없이 화면 동작을 확인할 수 있다.
5. **[직접 수행]** Production Branch를 `main`으로 확인하고 **Deploy**를 누른다. Vercel이 제공하는 배포 URL을 기록한다.
6. **[직접 수행]** 새 환경변수나 수정된 값은 기존 배포에 반영되지 않으므로, 변경 뒤에는 Redeploy한다.

## 3. 민감 정보 보관 규칙

| 위치 | 허용 여부 | 규칙 |
| --- | --- | --- |
| 로컬 `.env.local` | 허용 | 개발자 컴퓨터에만 둔다. Git 추적에서 제외한다. |
| Vercel Project Environment Variables | 허용 | Production/Preview를 구분해 등록한다. 접근 권한이 있는 최소 인원만 볼 수 있게 한다. |
| Supabase Dashboard | 허용 | 프로젝트의 서버 연결 정보를 확인하는 관리 화면으로만 사용한다. |
| `.env.example`, 문서, README, 이슈, 채팅, 화면 | 금지 | 실제 값은 적지 않고 변수 이름만 적는다. |
| Git 커밋·브랜치·태그·PR 설명 | 금지 | 실수로 포함했다면 즉시 키를 교체한다. |
| 브라우저 번들, 클라이언트 코드, API 응답, 로그 | 금지 | `NEXT_PUBLIC_` 접두어를 붙이지 않는다. 내부 API만 서버에서 키를 사용한다. |

## 4. 배포 후 확인 기록

아직 Vercel 배포 URL이 만들어지지 않았으므로, 아래의 외부 배포 확인 항목은 모두 **미실행**이다. URL이 생긴 뒤 결과 열을 갱신한다. 키 값이나 원문 오류를 기록하지 않는다.

| 확인 항목 | 방법 | 환경 | 결과 | 사유 또는 기대 결과 |
| --- | --- | --- | --- | --- |
| Production 빌드 | Vercel Deployment의 Build 로그 상태 확인 | Vercel Production | 미실행 | Vercel 프로젝트와 배포 URL이 아직 없다. |
| 목록 화면(F1) | `https://배포-주소/` 접속 후 날짜·기간·검색 조작 | Vercel Production, live | 미실행 | 목록·검색·출처·상태 안내가 표시되어야 한다. |
| 인사이트 화면(F2) | `https://배포-주소/insights` 접속 후 7/14/30일 선택 | Vercel Production, live | 미실행 | 진행률·날짜별 상태·차트가 표시되어야 한다. |
| 내부 API | 배포 주소에서 목록 화면을 조회하고 브라우저 Network에서 내부 `/api/box-office` 응답만 쓰는지 확인 | Vercel Production, live | 미실행 | KOBIS 직접 호출이나 키 노출이 없어야 한다. |
| 캐시 우선 | 같은 날짜·기간을 두 번 조회하고 두 번째 응답의 출처가 캐시인지 확인 | Vercel Production, live + Supabase | 미실행 | 첫 요청은 최신 저장 또는 KOBIS, 다음 요청은 유효 캐시여야 한다. |
| demo 모드 | Preview 환경을 `DATA_MODE=demo`로 배포해 `/`와 `/insights` 확인 | Vercel Preview, demo | 미실행 | 키 없이 fixture 데이터와 빈 날짜 처리가 동작해야 한다. |
| 로컬 품질 검사 | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` | 로컬 | 통과 | 이전 구현 검증에서 통과했다. 배포 직전 변경이 있으면 다시 실행한다. |

## 5. 운영 상황별 대응

### 환경변수를 변경했을 때

1. **[직접 수행]** Vercel의 해당 Project/Environment에서 값만 수정한다.
2. Production과 Preview에 필요한 값이 각각 있는지 확인한다.
3. **[직접 수행]** 새 Production 또는 Preview 배포를 실행한다. 환경변수 변경은 기존 배포에 적용되지 않는다.
4. 배포 URL에서 목록·인사이트·내부 API를 다시 확인하고 위 표를 갱신한다.

### 배포를 되돌릴 때

1. 문제가 있는 배포의 URL, 시각, 증상을 기록한다. 민감한 응답 내용은 기록하지 않는다.
2. **[직접 수행]** Vercel Dashboard의 Deployments에서 마지막 정상 배포를 Promote하거나, 코드 문제라면 수정 커밋을 만들어 `main`에 반영한다.
3. 환경변수 문제라면 정상 값으로 수정하고 새 배포를 만든다. 과거 배포가 이전 환경변수 값을 자동으로 받는다고 가정하지 않는다.
4. 되돌린 URL에서 F1·F2와 캐시 우선 동작을 다시 확인한다.

### 키가 노출됐을 때

1. 노출된 키 사용을 중지하고, **[직접 수행]** KOBIS 및 Supabase Dashboard에서 해당 키를 즉시 폐기·교체한다.
2. 새 값을 로컬 `.env.local`과 Vercel 환경변수에만 등록하고, 새 배포를 실행한다.
3. 노출 위치가 Git이라면 현재 파일에서 값을 제거한다. 이미 공유·푸시한 이력은 명시적 승인 없이 재작성하지 않으며, 키 교체를 우선한다.
4. 접근 로그와 예상치 못한 API·DB 활동을 확인하고, 영향 범위와 조치 시각만 기록한다. 키 값은 기록하지 않는다.

## 6. 다른 컴퓨터에서 재현하기

### 따라 하는 절차

1. Node.js `22.14.0`과 Git을 설치한다.
2. 저장소를 새 폴더에 clone하고 해당 폴더로 이동한다.

   ```powershell
   git clone https://github.com/tkdtjs702/vibe.git
   Set-Location vibe
   npm ci
   ```

3. `.env.example`을 `.env.local`로 복사한 뒤, 키 없이 먼저 `DATA_MODE=demo`로 둔다.

   ```powershell
   Copy-Item .env.example .env.local
   npm run dev
   ```

4. 브라우저에서 `http://localhost:3000`과 `http://localhost:3000/insights`를 확인한다.
5. 품질 검사를 실행한다.

   ```powershell
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

6. live 모드가 필요하면, 별도로 발급·관리하는 값을 `.env.local`의 `KOBIS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`에 입력하고 `DATA_MODE=live`로 변경한다. migration 실행이 선행되어야 한다.

### 확인 범위 기록

| 범위 | 결과 | 근거 |
| --- | --- | --- |
| 현재 작업 폴더에서 Node.js 22.14.0 및 npm 스크립트 구성 확인 | 통과 | `.node-version`, `package.json`을 확인했다. |
| 현재 작업 폴더의 lint·typecheck·test·build | 통과 | 이전 구현 검증에서 네 명령이 통과했다. |
| 같은 PC의 별도 새 폴더에서 clone 후 demo 실행 | 미실행 | 이 문서 작성 시점에는 별도 clone 검증을 수행하지 않았다. |
| 다른 컴퓨터의 clone 후 demo/live 실행 | 미실행 | 다른 컴퓨터 환경에 접근하지 않았다. |
| Vercel Production 배포 후 실행 | 미실행 | Vercel 로그인·프로젝트 생성·배포는 사용자가 직접 수행해야 한다. |

## 참고

- [Vercel 환경변수 관리](https://vercel.com/docs/environment-variables)
- [Vercel 배포 환경](https://vercel.com/docs/deployments/environments)
- [Supabase 운영 전 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod)
- [로컬 실행과 환경변수](../README.md)
