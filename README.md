# 영화 박스오피스 인사이트 대시보드

KOBIS(영화진흥위원회) 박스오피스 데이터를 서버에서 조회·검증·캐시하여, 날짜별 순위와 최근 7·14·30일의 **일별 Top 10 관측 데이터 기준** 인사이트를 보여주는 Next.js 서비스입니다. 브라우저는 내부 API만 호출하며 KOBIS와 Supabase의 서버용 비밀값은 클라이언트에 전달하지 않습니다.

## 필요한 환경

- Node.js `22.14.0` (`.node-version` 기준)
- npm (Node.js에 포함)
- Git (저장소 clone 시)
- live 모드만: KOBIS API 접근 권한과 Supabase 프로젝트

## 설치와 실행

```powershell
git clone https://github.com/tkdtjs702/vibe.git
Set-Location vibe
npm ci
Copy-Item .env.example .env.local
npm run dev
```

개발 서버를 시작한 뒤 다음 주소를 연다.

- 목록 화면(F1): `http://localhost:3000`
- 인사이트 화면(F2): `http://localhost:3000/insights`

## 키 없이 먼저 실행하기: demo 모드

`.env.local`에서 아래처럼 설정하면 외부 API나 데이터베이스 없이 fixture 데이터로 동작합니다.

```dotenv
DATA_MODE=demo
```

demo 모드 확인 예시는 다음과 같습니다.

| 확인 항목 | 입력 | 기대 결과 |
| --- | --- | --- |
| 정상 목록 | 날짜 `2026-09-07`, 일간 | fixture 영화 목록 표시 |
| 정상 빈 결과 | 날짜 `2026-09-06`, 일간 | 해당 기간에 데이터가 없다는 안내 |
| 검색 결과 있음 | 영화명 `바다` | 일치하는 영화 표시 |
| 검색 결과 없음 | 존재하지 않는 제목 | 검색 결과 없음 안내, 기존 날짜·기간 데이터 유지 |
| 빈 날짜가 포함된 추이 | 인사이트에서 14일 또는 30일 선택 | 빈 날짜가 선으로 연결되지 않음 |

## live 모드 준비

실제 KOBIS 조회 및 Supabase 캐시를 쓰려면 `.env.local`에서 `DATA_MODE=live`로 설정하고 아래 **이름의 변수만** 설정합니다.

| 환경변수 이름 | 용도 | 사용 위치 |
| --- | --- | --- |
| `DATA_MODE` | `demo` 또는 `live` 선택 | 서버 설정 |
| `KOBIS_API_KEY` | KOBIS 서버 API 호출 | 서버 전용 |
| `SUPABASE_URL` | Supabase 서버 연결 | 서버 전용 |
| `SUPABASE_SECRET_KEY` | Supabase 서버 관리 권한 연결 | 서버 전용 |

실제 값은 `.env.local`과 Vercel의 환경변수 설정에만 보관합니다. `.env.local`은 Git에 추가하지 않고, 키를 문서·소스·브라우저 번들·로그·API 응답에 넣지 않습니다.

live 모드를 시작하기 전에는 Supabase SQL Editor에서 [캐시 migration](supabase/migrations/202610250001_box_office_cache.sql)을 실행합니다. 세 테이블과 `save_box_office_period`, `read_box_office_period` 함수가 생성됩니다.

## 명령어

| 목적 | 명령어 |
| --- | --- |
| 개발 서버 | `npm run dev` |
| 프로덕션 빌드 | `npm run build` |
| 프로덕션 서버 실행 | `npm run start` |
| 린트 | `npm run lint` |
| 타입 검사 | `npm run typecheck` |
| 단위 테스트 | `npm run test` |
| 화면 테스트 | `npm run test:e2e` |
| DB 저장본 대조 | `npm run verify:data -- --date=YYYY-MM-DD --period=daily` |

`verify:data`는 live 모드용 환경변수가 준비된 경우에만 사용합니다. DB를 수정하지 않고 저장본·원본 응답·새 KOBIS 응답을 비교합니다.

## 배포

Vercel(Hobby) + Supabase(Free) 기준의 무료 플랜 조건, 환경변수 등록, 배포 후 확인, 되돌리기와 키 노출 대응은 [배포 안내서](docs/DEPLOYMENT.md)를 따릅니다. Vercel과 Supabase의 무료 한도는 변할 수 있으므로 배포 직전에 안내서의 공식 링크에서 재확인합니다.

## 문서

- [제품 요구사항](PRD.md)
- [아키텍처](ARCHITECTURE.md)
- [기술 결정 기록](ADR.md)
- [데이터 모델](ERD.md)
- [구현 계획](docs/IMPLEMENTATION.md)
- [KOBIS API·캐시 안내](docs/API_GUIDE.md)
- [인수 기준 확인 기록](docs/ACCEPTANCE.md)
- [배포 안내](docs/DEPLOYMENT.md)
