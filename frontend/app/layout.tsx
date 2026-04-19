import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PosthogProvider from "@/components/PosthogProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JOSAA Rank Finder — Find Your Best College Option",
  description:
    "Enter your JEE rank, category, gender, and home state to see all NITs, IIITs, and GFTIs you can get into through JOSAA counselling.",
  keywords: ["JOSAA", "JEE", "NIT", "IIIT", "college predictor", "rank finder"],
  openGraph: {
    title: "JOSAA Rank Finder",
    description: "Find every college and branch available for your JEE rank.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PosthogProvider>{children}</PosthogProvider>
      </body>
    </html>
  );
}
