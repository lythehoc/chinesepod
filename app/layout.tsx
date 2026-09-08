import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const handwritingFont = localFont({
  src: "./fonts/PatrickHand-Regular.ttf",
  variable: "--font-handwriting",
  weight: "400",
  style: "normal",
  display: "swap",
});

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "media-src 'self' https:",
  "frame-src https://www.youtube-nocookie.com",
  "connect-src 'self' https://www.chinesepod.com https://chinesepod.com",
  "upgrade-insecure-requests",
].join("; ");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Mandarin Steps — A little Chinese, every day.",
  description:
    "Learn Mandarin with recorded podcasts, starter lessons with pinyin and English, and Ori Princess episodes.",
  referrer: "strict-origin-when-cross-origin",
  manifest: `${assetBase}/manifest.webmanifest`,
  icons: {
    icon: `${assetBase}/favicon.svg`,
    shortcut: `${assetBase}/favicon.svg`,
    apple: `${assetBase}/favicon.svg`,
  },
  openGraph: {
    title: "Mandarin Steps — A little Chinese, every day.",
    description:
      "Learn Mandarin with recorded podcasts, starter lessons with pinyin and English, and Ori Princess episodes.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Mandarin Steps — A little Chinese, every day.",
    description:
      "Learn Mandarin with recorded podcasts, starter lessons with pinyin and English, and Ori Princess episodes.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
    { media: "(prefers-color-scheme: light)", color: "#f2efe8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={handwritingFont.variable}
      suppressHydrationWarning
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy} />
      </head>
      <body>{children}</body>
    </html>
  );
}
