import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeApplier from "@/components/providers/ThemeApplier";
import SettingsPanel from "@/components/layout/SettingsPanel";
import { CredentialsProvider } from "@/lib/context/credentials-context";
import { RequireCredentials } from "@/components/auth/RequireCredentials";
import { ConditionalServiceProvider } from "@/components/providers/ConditionalServiceProvider";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";

const enableVercelAnalytics =
  process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true';

const binancePlex = localFont({
  src: [
    { path: "./font/BinancePlex-Light.woff2", weight: "300", style: "normal" },
    { path: "./font/BinancePlex-Regular.woff2", weight: "400", style: "normal" },
    { path: "./font/BinancePlex-Medium.woff2", weight: "500", style: "normal" },
    { path: "./font/BinancePlex-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-binance",
  display: "swap",
});

const siteUrl = "https://ritexai.com";
const ogImage = `${siteUrl}/landing/hero.png`;

export const metadata: Metadata = {
  title: "RITEX AI | Advanced Multi-Exchange Trading Terminal",
  description: "Professional multi-exchange trading terminal. Real-time charts, market scanner, divergence detection & instant execution. 100% client-side — your credentials never leave your browser.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "RITEX AI — Advanced Multi-Exchange Trading Terminal",
    description: "Professional multi-exchange trading terminal. Real-time charts, market scanner, divergence detection & instant order execution. 100% client-side.",
    siteName: "RITEX AI",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "RITEX AI Trading Terminal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RITEX AI — Multi-Exchange Trading Terminal",
    description: "Real-time charts, market scanner, divergence detection & instant execution. 100% client-side — your credentials never leave your browser.",
    images: [ogImage],
  },
  authors: [{ name: "RITEX AI", url: "https://ritexai.com" }],
  keywords: [
    "Hyperliquid",
    "Binance",
    "trading terminal",
    "RITEX AI",
    "crypto trading",
    "CEX/DEX trading",
    "technical analysis",
    "market scanner",
    "trading signals",
    "scalping",
    "DeFi",
    "multi-exchange trading",
    "perpetual trading",
    "crypto terminal",
    "real-time charts",
    "order execution",
    "divergence detection",
    "multi-timeframe analysis",
  ],
  other: {
    "ai-content-declaration": "RITEX AI is a professional multi-exchange trading terminal. Visit https://ritexai.com for more information.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" hrefLang="en" href="https://ritexai.com" />
        <link rel="alternate" hrefLang="vi" href="https://ritexai.com" />
        <link rel="alternate" hrefLang="zh" href="https://ritexai.com" />
        <link rel="alternate" hrefLang="x-default" href="https://ritexai.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "RITEX AI",
              url: siteUrl,
              description: "Professional multi-exchange trading terminal with real-time charts, market scanner, and instant order execution.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              author: {
                "@type": "Organization",
                name: "RITEX AI",
                url: "https://ritexai.com",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${binancePlex.variable} subpixel-antialiased`}
        suppressHydrationWarning
      >
        <CredentialsProvider>
          <ThemeApplier />
          <SettingsPanel />
          <RequireCredentials>
            <ConditionalServiceProvider>
              {children}
            </ConditionalServiceProvider>
          </RequireCredentials>
        </CredentialsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background-secondary)',
              color: 'var(--primary)',
              border: '1px solid var(--border-frame)',
              fontFamily: 'var(--font-binance), BinancePlex, sans-serif',
              fontSize: '12px',
            },
            success: {
              icon: null,
              style: {
                border: '1px solid var(--status-bullish)',
              },
            },
            error: {
              icon: null,
              style: {
                border: '1px solid var(--status-bearish)',
              },
            },
          }}
        />
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  );
}
