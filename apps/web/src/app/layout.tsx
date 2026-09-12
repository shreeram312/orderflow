import type { Metadata } from "next";
import { Caveat, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

// Plus Jakarta Sans carries real weights (Antic was single-weight, so every
// heading and button was being synthetically bolded by the browser).
const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Used only for the handwritten accent lines on the auth pages.
const fontScript = Caveat({
  subsets: ["latin"],
  variable: "--font-script",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OrderFlow",
  description: "Good Food. Better Experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontScript.variable} ${fontMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
