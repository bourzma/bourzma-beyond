import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda } from "next/font/google";
import "./globals.css";

// Display: Archivo at its narrowest width and heaviest weight.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

// Editorial accent: Bodoni Moda italic.
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin", "latin-ext"],
  style: ["italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Bourzma: Beyond the Ordinary",
  description: "Find your Beyond Type.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${bodoni.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
