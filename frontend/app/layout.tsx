import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Vishwavrinda Ayurveda Dashboard",
  description: "Administrative dashboard for WhatsApp AI clinic activity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors closeButton position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
