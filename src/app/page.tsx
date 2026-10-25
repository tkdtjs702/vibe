import { BoxOfficeDemo } from "@/components/box-office-demo";
import Image from "next/image";
import styles from "./page.module.css";

export function LegacyHome() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.eyebrow}>KOBIS BOX OFFICE</p>
        <h1>영화 박스오피스 인사이트</h1>
        <p className={styles.description}>
          날짜별 순위와 매출·관객 추이를 조회하는 대시보드의 실행 가능한 시작
          화면입니다.
        </p>
        <div className={styles.ctas}>
          <a
            className={styles.primary}
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className={styles.logo}
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className={styles.secondary}
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return <BoxOfficeDemo />;
}
