import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_TC, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-tc',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '課堂抽籤分組台 — 教師點名與視覺化分組工具',
  description:
    '專為教師設計的班級互動工具，支援 CSV 匯入與貼上名單、動畫音效隨機抽籤（可設定重複或不重複），以及視覺化自動分組與座位配置。',
  openGraph: {
    title: '課堂抽籤分組台 — 教師點名與視覺化分組工具',
    description:
      '支援 CSV 匯入與貼上名單、動畫音效隨機抽籤，以及視覺化自動分組與教室圓桌圖。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '課堂抽籤分組台',
    description:
      '支援 CSV 匯入與貼上名單、動畫音效隨機抽籤，以及視覺化自動分組與教室圓桌圖。',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      className={`${plusJakarta.variable} ${notoSansTC.variable} ${ibmPlexMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-[#0284C7]/15 selection:text-[#0369A1]"
      >
        {children}
      </body>
    </html>
  );
}
