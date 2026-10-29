import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ClientProviders } from "@/components/client-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Patterns-Collaboration Workspace",
  description: "Shared inbox collaboration workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontFeatureSettings: '"rlig" 1, "calt" 1' }}
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <NuqsAdapter>
          <ClientProviders>{children}</ClientProviders>
        </NuqsAdapter>
      </body>
    </html>
  );
}
