import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { Geist, Geist_Mono, Tenor_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { categoriesApi } from "@/lib/api";
import type { Category } from "@/lib/api";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const tenorSans = Tenor_Sans({
  variable: "--font-tenor-sans",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MAISON",
  description: "Votre destination pour le streetwear et la mode de qualité.",
};

// Cached for 60s. It must NOT catch errors: a thrown error is never cached,
// but a returned [] would be cached for the whole cache lifetime.
async function fetchCategories(): Promise<Category[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  cacheTag("categories");

  const result = await categoriesApi.getAll();
  return Array.isArray(result)
    ? result
    : ((result as { data?: Category[] })?.data ?? []);
}

async function loadCategories(): Promise<Category[]> {
  await connection(); // request time only, never during `next build`
  try {
    return await fetchCategories();
  } catch (err) {
    console.error("[layout] Failed to load categories:", err);
    return []; // fallback is returned here, outside the cache
  }
}

async function NavbarWithCategories() {
  return <Navbar categories={await loadCategories()} />;
}

async function FooterWithCategories() {
  return <Footer categories={await loadCategories()} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${tenorSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<Navbar categories={[]} />}>
          <NavbarWithCategories />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<Footer categories={[]} />}>
          <FooterWithCategories />
        </Suspense>
      </body>
    </html>
  );
}