"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { BoxOfficeEntry, PeriodType } from "@/lib/box-office-fixture";
import styles from "./box-office-demo.module.css";

type Scenario = "normal" | "loading" | "error";

type BoxOfficeResponse = {
  data: {
    entries: BoxOfficeEntry[];
  };
  meta: {
    dataMode: "demo" | "live";
    date: string;
    periodType: PeriodType;
    source: "fixture" | "kobis" | "cache";
    fetchedAt: string;
    isEmpty: boolean;
  };
};

type QueryMeta = BoxOfficeResponse["meta"];

const DEFAULT_DATE = "2026-09-07";

const formatNumber = (value: number, suffix: string) =>
  `${new Intl.NumberFormat("ko-KR").format(value)}${suffix}`;

export function BoxOfficeDemo() {
  const [date, setDate] = useState(DEFAULT_DATE);
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const [search, setSearch] = useState("");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [entries, setEntries] = useState<BoxOfficeEntry[]>([]);
  const [queryMeta, setQueryMeta] = useState<QueryMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");

      try {
        const response = await fetch(
          `/api/box-office?date=${date}&periodType=${periodType}&scenario=${scenario}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const failure = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(failure?.error?.message ?? "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }

        const payload = (await response.json()) as BoxOfficeResponse;
        setEntries(payload.data.entries);
        setQueryMeta(payload.meta);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setHasError(true);
          setEntries([]);
          setQueryMeta(null);
          setErrorMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [date, periodType, scenario]);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => entry.movieNm.includes(search.trim())),
    [entries, search],
  );

  const collectedAt = queryMeta
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(queryMeta.fetchedAt))
    : null;

  const updateDate = (event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value);
    setScenario("normal");
  };

  const updatePeriodType = (event: ChangeEvent<HTMLSelectElement>) => {
    setPeriodType(event.target.value as PeriodType);
    setScenario("normal");
  };

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.eyebrow}>
          DATA_MODE: {queryMeta?.dataMode ?? "loading"}
        </p>
        <h1>영화 박스오피스 목록</h1>
        <p className={styles.description}>
          KOBIS 호출 없이 fixture로 목록 화면(F1)의 조회 상태를 확인합니다.
        </p>

        <div className={styles.controls}>
          <label>
            조회 날짜
            <input type="date" value={date} onChange={updateDate} />
          </label>
          <label>
            기간 유형
            <select value={periodType} onChange={updatePeriodType}>
              <option value="daily">일간</option>
              <option value="weekly">주간</option>
              <option value="weekend">주말</option>
            </select>
          </label>
          <label className={styles.search}>
            영화명 검색
            <input
              type="search"
              placeholder="예: 바다"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {queryMeta?.dataMode === "demo" ? (
          <div className={styles.demoButtons} aria-label="상태 데모 제어">
            <button type="button" onClick={() => setScenario("normal")}>
              일반 조회
            </button>
            <button type="button" onClick={() => setScenario("loading")}>
              로딩 상태 보기
            </button>
            <button type="button" onClick={() => setScenario("error")}>
              오류 상태 보기
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <StatusPanel
            title="데이터를 불러오는 중입니다."
            description="선택한 날짜와 기간의 demo 데이터를 조회하고 있습니다."
          />
        ) : hasError ? (
          <StatusPanel
            title={errorMessage}
            description="오류 상태는 demo 화면에서만 재현한 것이며, 상세 오류는 표시하지 않습니다."
            actionLabel="다시 시도"
            onAction={() => setScenario("normal")}
          />
        ) : entries.length === 0 ? (
          <StatusPanel
            title="선택한 날짜와 기간의 박스오피스 데이터가 없습니다. 다른 날짜 또는 기간을 선택해 보세요."
            description="정상적으로 조회되었지만 해당 기간의 데이터가 없는 결과입니다. 오류가 아닙니다."
          />
        ) : filteredEntries.length === 0 ? (
          <StatusPanel
            title={`“${search}”와 일치하는 영화가 없습니다.`}
            description="현재 날짜와 기간의 박스오피스 데이터는 유지되어 있습니다. 검색어를 바꾸거나 초기화해 보세요."
            actionLabel="검색 초기화"
            onAction={() => setSearch("")}
          />
        ) : (
          <div className={styles.result}>
            <div className={styles.resultMeta} aria-label="조회 메타정보">
              <strong>조회 {filteredEntries.length}건</strong>
              <span>전체 {entries.length}건</span>
              <span>출처: {queryMeta?.source === "kobis" ? "KOBIS Open API" : queryMeta?.source === "cache" ? "Supabase 캐시" : "demo fixture"}</span>
              {collectedAt ? <span>수집 시각: {collectedAt}</span> : null}
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>영화명</th>
                    <th>개봉일</th>
                    <th>매출</th>
                    <th>관객수</th>
                    <th>누적 관객수</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.movieCd}>
                      <td>{entry.rank}</td>
                      <td>{entry.movieNm}</td>
                      <td>{entry.openDt}</td>
                      <td>{formatNumber(entry.salesAmt, "원")}</td>
                      <td>{formatNumber(entry.audiCnt, "명")}</td>
                      <td>{formatNumber(entry.audiAcc, "명")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {queryMeta?.dataMode === "demo" ? <aside className={styles.guide}>
          <h2>상태 확인 방법</h2>
          <ul>
            <li>성공: 2026-09-07 ~ 2026-09-13 중 날짜를 선택하고 검색어를 비웁니다. “바다”를 검색하면 “바다의 노래”가 표시됩니다.</li>
            <li>정상 빈 결과: 날짜를 2026-09-06으로 선택합니다. 이는 오류가 아닌, 해당 기간 데이터 없음입니다.</li>
            <li>검색 결과 없음: 데이터가 있는 날짜에서 “없는 제목”을 검색합니다. 날짜·기간 데이터 자체가 없다는 안내와는 다르게 표시됩니다.</li>
            <li>로딩: “로딩 상태 보기”를 선택합니다.</li>
            <li>오류: “오류 상태 보기”를 선택합니다.</li>
          </ul>
        </aside> : null}
      </section>
    </main>
  );
}

type StatusPanelProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function StatusPanel({
  title,
  description,
  actionLabel,
  onAction,
}: StatusPanelProps) {
  return (
    <section className={styles.statusPanel} role="status">
      <p>{title}</p>
      {description ? <p className={styles.statusDescription}>{description}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
