import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "@/components/providers/swr-provider";

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rubik",
});

export const viewport: Viewport = {
  themeColor: "#35b718",
};

export const metadata: Metadata = {
  title: {
    default: "Cafe Gonku",
    template: "%s | Cafe Gonku",
  },
  description: "Modern Cafe Management System - QR-Based Smart Ordering",
  keywords: ["cafe", "gonku", "ordering system", "restaurant", "qr menu"],
  authors: [{ name: "Gonku Team" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cafe Gonku",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://cafe-gonku.vercel.app",
    siteName: "Cafe Gonku",
    title: "Cafe Gonku - Smart QR Ordering",
    description: "Pesan makanan lebih cepat dengan scan QR code di meja kamu.",
    images: [
      {
        url: "https://cafe-gonku.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Cafe Gonku",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cafe Gonku",
    description: "Smart QR Ordering System",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${rubik.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <SWRProvider>
          {children}
        </SWRProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker"in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js")})}`,
          }}
        />
      </body>
    </html>
  );
}
