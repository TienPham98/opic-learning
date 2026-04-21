import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPIc Learn — Luyện thi OPIc thông minh",
  description: "Nền tảng luyện thi OPIc với AI: flashcard từ vựng, bài mẫu, chấm điểm tức thì.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Be Vietnam Pro — Google Fonts, designed for Vietnamese */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
