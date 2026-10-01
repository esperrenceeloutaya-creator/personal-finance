import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "التسيير المالي الشخصي",
  description: "نظام بسيط لإدارة المداخيل والمصاريف الشخصية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}