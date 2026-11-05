import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Samps Financeiro",
  description: "Financeiro e RH da Samps Digital",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
