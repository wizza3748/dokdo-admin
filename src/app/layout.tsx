import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  title: "Dokdo - Admin",
  description: "Dokdo Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
