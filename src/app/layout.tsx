import "./globals.css";
import type { Metadata } from "next";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { AuthProvider } from "./components/AuthProvider";
import { PageTransition } from "./components/PageTransition";

export const metadata: Metadata = {
  metadataBase: new URL("https://midi.softowetto.com"),
  title: {
    default: "GiveMeMIDI | Discover, Share, and Download MIDI Files",
    template: "%s | GiveMeMIDI",
  },
  description:
    "GiveMeMIDI is a community MIDI library for discovering arrangements, sharing uploads, previewing sheet music, bookmarking favorites, and following creators.",
  applicationName: "GiveMeMIDI",
  keywords: [
    "MIDI",
    "sheet music",
    "music files",
    "MIDI downloads",
    "piano MIDI",
    "arrangements",
    "music creators",
  ],
  authors: [{ name: "GiveMeMIDI" }],
  creator: "GiveMeMIDI",
  publisher: "GiveMeMIDI",
  category: "music",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: "https://midi.softowetto.com",
    siteName: "GiveMeMIDI",
    title: "GiveMeMIDI | Discover, Share, and Download MIDI Files",
    description:
      "Browse community MIDI uploads, preview sheet music, bookmark favorites, and follow creators.",
    images: [
      {
        url: "/sheet-music-placeholder.png",
        width: 1200,
        height: 630,
        alt: "GiveMeMIDI sheet music preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GiveMeMIDI | Discover, Share, and Download MIDI Files",
    description:
      "Browse community MIDI uploads, preview sheet music, bookmark favorites, and follow creators.",
    images: ["/sheet-music-placeholder.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <AuthProvider>
          <Header />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
