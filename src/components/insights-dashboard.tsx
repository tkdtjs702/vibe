"use client";
import { useCallback, useEffect, useState } from "react";
import type { BoxOfficeEntry } from "@/lib/box-office-fixture";
import { aggregateInsights, formatAudience, formatWon, type DailyResult } from "@/lib/insights";
import styles from "./insights-dashboard.module.css";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const datesFor = (days: number) => Array.from({ length: days }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (days - 1 - index)); return iso(date); });
type ApiResponse = { data: { entries: BoxOfficeEntry[] } };
export function InsightsDashboard() {
  const [days, setDays] = useState(7); const [results, setResults] = useState<DailyResult[]>([]);
  const load = useCallback(async (date: string) => {
    setResults((current) => current.map((item) => item.date === date ? { ...item, status: "loading" } : item));
    try { const response = await fetch(`/api/box-office?date=${date}&periodType=daily`); if (!response.ok) throw new Error(); const body = await response.json() as ApiResponse; setResults((current) => current.map((item) => item.date === date ? { date, status: body.data.entries.length ? "success" : "empty", entries: body.data.entries } : item)); }
    catch { setResults((current) => current.map((item) => item.date === date ? { date, status: "error", entries: [] } : item)); }
  }, []);
  useEffect(() => {
    const initial = datesFor(7);
    const timer = setTimeout(() => {
      setResults(initial.map((date) => ({ date, status: "loading", entries: [] })));
      initial.forEach((date) => void load(date));
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const changeDays = (value: number) => { const next = datesFor(value); setDays(value); setResults(next.map((date) => ({ date, status: "loading", entries: [] }))); next.forEach((date) => void load(date)); };
  const insight = aggregateInsights(results); const counts = results.reduce((acc, result) => ({ ...acc, [result.status]: acc[result.status] + 1 }), { success: 0, empty: 0, error: 0, loading: 0 });
  const max = Math.max(...insight.line.map((item) => item.sales ?? 0), 1);
  return <main className={styles.page}><section className={styles.content}><p className={styles.eyebrow}>F2 · 일별 Top 10 관측 데이터 기준</p><h1>박스오피스 인사이트</h1><p className={styles.notice}>전체 통계가 아닌 일별 Top 10 관측 데이터입니다. 순위 밖 영화의 매출은 0으로 추정하지 않습니다.</p>
    <div className={styles.controls} aria-label="조회 기간">{[7,14,30].map((value) => <button key={value} aria-pressed={days === value} onClick={() => changeDays(value)}>최근 {value}일</button>)}</div>
    <p className={styles.progress}>조회 진행률: {counts.success + counts.empty + counts.error}/{days}일 · 정상 {counts.success} · 빈 날짜 {counts.empty} · 실패 {counts.error} · 조회 중 {counts.loading}</p>
    <section className={styles.chart}><h2>일별 Top 10 관측 매출 합계 추이</h2><p>빈 날짜·실패 날짜는 선을 잇지 않습니다.</p><div className={styles.line}>{insight.line.map((point) => <div key={point.date} className={styles.point}>{point.sales === null ? <span className={styles.gap}>끊김</span> : <><span style={{ height: `${Math.max(8, point.sales / max * 100)}%` }} /><b>{formatWon(point.sales)}</b></>}<small>{point.date.slice(5)}</small></div>)}</div></section>
    {insight.isComplete ? <><div className={styles.metrics}><article><span>관측 관객 합계</span><strong>{formatAudience(insight.totalAudience ?? 0)}</strong></article><article><span>관객당 매출</span><strong>{insight.revenuePerAudience ? `${Math.round(insight.revenuePerAudience).toLocaleString("ko-KR")}원` : "—"}</strong></article></div><section className={styles.chart}><h2>기간 내 영화별 관측 매출 Top 5</h2><p>영화명 아닌 movieCd로 묶은 관측 매출 합계입니다.</p>{insight.topMovies.map((movie) => <div className={styles.bar} key={movie.movieCd}><span>{movie.movieNm}</span><i style={{ width: `${movie.sales / (insight.topMovies[0]?.sales ?? 1) * 100}%` }} /><b>{formatWon(movie.sales)}</b></div>)}</section></> : <section className={styles.incomplete}><h2>기간 합계와 Top 5는 아직 표시하지 않습니다.</h2><p>모든 날짜가 정상일 때만 기간 합계·순위를 계산합니다.</p></section>}
    {results.filter((item) => item.status === "error").map((item) => <button className={styles.retry} key={item.date} onClick={() => void load(item.date)}>{item.date} 다시 시도</button>)}
  </section></main>;
}
