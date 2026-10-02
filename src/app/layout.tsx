import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app/app-shell";
import { PrototypeBootstrap } from "@/components/app/prototype-bootstrap";

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
        <PrototypeBootstrap enabled={process.env.VERCEL === "1"}>
          <AppShell>{children}</AppShell>
        </PrototypeBootstrap>
      </body>
    </html>
  );
}
