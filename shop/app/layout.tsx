import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { categoriesApi } from "@/lib/api";
import type { Category } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MayaStore",
  description: "Votre destination pour le streetwear et la mode de qualité.",
};

async function fetchCategories(): Promise<Category[]> {
  "use cache";
  try {
    const result = await categoriesApi.getAll();
    return Array.isArray(result)
      ? result
      : Array.isArray((result as { data?: Category[] })?.data)
        ? (result as { data: Category[] }).data
        : [];
  } catch (err) {
    console.error("[layout] Failed to load categories:", err);
    return [];
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const categories = await fetchCategories();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer categories={categories} />
      </body>
    </html>
  );
}
