import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/features/auth/AuthContext";
import { AuthenticatedThemeBootstrap } from "@/features/theme/AuthenticatedThemeBootstrap";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/features/theme/theme";
import { ToastProvider } from "@/context/ToastContext";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life As Game",
  description: "Your life, gamified.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="warm-beige" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} /></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <AuthenticatedThemeBootstrap />
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
