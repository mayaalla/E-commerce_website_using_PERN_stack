"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import type { Category } from "@/lib/api";
import { categoryToSlug } from "@/lib/api";

interface NavMobileMenuProps {
  categories: Category[];
}

/**
 * Client-only slice of the Navbar that needs browser interactivity (Sheet).
 * Keeping this isolated lets the parent Navbar stay a Server Component.
 *
 * Note: SheetTrigger wraps @base-ui/react Dialog.Trigger which renders its
 * own <button>. We pass our icon content directly as children — no asChild needed.
 */
export function NavMobileMenu({ categories }: NavMobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger
        className="lg:hidden inline-flex items-center justify-center rounded-lg size-8 hover:bg-muted transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="flex flex-col gap-1 mt-8">
          <Link href="/" className="font-serif text-lg font-bold mb-6 block">
            MAYA<span className="text-muted-foreground font-light">STORE</span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug ?? categoryToSlug(cat.name)}`}
              className="px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
