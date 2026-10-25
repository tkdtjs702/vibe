import type { BoxOfficeEntry } from "@/lib/box-office-fixture";

export type DailyResult = { date: string; status: "success" | "empty" | "error" | "loading"; entries: BoxOfficeEntry[] };

export const aggregateInsights = (results: DailyResult[]) => {
  const normal = results.filter((result) => result.status === "success");
  const isComplete = normal.length === results.length && results.length > 0;
  const line = results.map((result) => ({
    date: result.date,
    sales: result.status === "success" ? result.entries.reduce((sum, entry) => sum + entry.salesAmt, 0) : null,
  }));
  if (!isComplete) return { isComplete, line, topMovies: [], totalAudience: null, revenuePerAudience: null };
  const movies = new Map<string, { movieCd: string; movieNm: string; sales: number }>();
  let totalAudience = 0;
  normal.forEach(({ entries }) => entries.forEach((entry) => {
    totalAudience += entry.audiCnt;
    const current = movies.get(entry.movieCd) ?? { movieCd: entry.movieCd, movieNm: entry.movieNm, sales: 0 };
    current.sales += entry.salesAmt;
    movies.set(entry.movieCd, current);
  }));
  const topMovies = [...movies.values()].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const totalSales = topMovies.reduce((sum, movie) => sum + movie.sales, 0);
  const allSales = normal.flatMap((item) => item.entries).reduce((sum, entry) => sum + entry.salesAmt, 0);
  return { isComplete, line, topMovies, totalAudience, revenuePerAudience: totalAudience > 0 ? allSales / totalAudience : null, totalSales };
};

export const formatWon = (value: number) => `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
export const formatAudience = (value: number) => `${(value / 1_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}천명`;
