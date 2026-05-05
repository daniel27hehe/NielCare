import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NielCare Dental — Smart Dental Clinic Booking",
  description:
    "Book dental appointments with AI-powered symptom analysis. NielCare Dental provides modern, efficient dental care management for patients, doctors, and clinic owners.",
  keywords: ["dental", "clinic", "booking", "appointment", "healthcare", "dentist"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
