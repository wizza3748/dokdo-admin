import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Dokdo - Admin",
  description: "Dokdo Admin Dashboard",
};

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

import { BreadcrumbHeader } from "@/components/ui/breadcrumb-header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} font-sans antialiased`}
      >
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset className="bg-slate-50/50 min-w-0">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur px-4 sticky top-0 z-10">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex items-center gap-2 px-4">
                <BreadcrumbHeader />
              </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 min-w-0 max-w-full overflow-x-hidden">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
