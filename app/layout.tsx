import type { Metadata } from "next";
import { IBM_Plex_Serif, Mona_Sans} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import Navbar from "@/components/Navbar";
import "./globals.css";
import {Toaster} from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";

const ibmPlexSerif = IBM_Plex_Serif({
    variable: "--font-ibm-plex-serif",
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap'
});

const monaSans = Mona_Sans({
    variable: '--font-mona-sans',
    subsets: ['latin'],
    display: 'swap'
})

export const metadata: Metadata = {
  title: "Revise",
  description: "Turn company docs into AI voice training, role-play practice, and readiness reports for new hires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${ibmPlexSerif.variable} ${monaSans.variable} relative font-sans antialiased`}
          >
            <ThemeProvider>
              <Navbar />
              {children}
              <Toaster />
            </ThemeProvider>
          </body>
        </html>
    </ClerkProvider>
  );
}
