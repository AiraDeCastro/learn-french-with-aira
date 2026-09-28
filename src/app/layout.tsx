import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "@/trpc/react";
import { Nav } from "./_components/Nav";
import "./globals.css";

// Nunito: friendly and rounded without sacrificing legibility at body-text
// sizes, which matters here since real French lesson text is read in it,
// not just UI chrome. Fredoka is reserved for headings — bolder and more
// playful, matching the "fun, vibrant" redesign Aira asked for.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Learn French with Aira",
  description: "Learn French through comprehensible input, one streak at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <TRPCReactProvider>
            <Nav />
            {children}
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
