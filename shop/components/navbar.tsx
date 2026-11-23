// Server Component — no "use client" directive needed.
// Categories are fetched once in layout.tsx and passed down as a prop,
// so there is no client-side waterfall here.

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartCount } from "@/components/cart/cart-count";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { NavMobileMenu } from "@/components/nav-mobile-menu";
import type { Category } from "@/lib/api";
import { categoryToSlug } from "@/lib/api";

interface NavbarProps {
  categories: Category[];
}

export default function Navbar({ categories }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">

        {/* Left: Logo + Categories */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-[family-name:var(--font-tenor-sans)] text-xl font-bold tracking-tight text-foreground">
              MAISON
            </span>
          </Link>

          {/* Desktop Categories */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-0">
              {categories.map((cat) => (
                <NavigationMenuItem key={cat.id}>
                  {/* base-ui NavigationMenuLink renders its own <a>; use the
                      href prop directly instead of asChild + Next <Link> */}
                  <NavigationMenuLink
                    href={`/categories/${cat.slug ?? categoryToSlug(cat.name)}`}
                    className={navigationMenuTriggerStyle()}
                  >
                    {cat.name}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Cart + Mobile Menu */}
        <div className="flex items-center gap-2">
          {/* Cart — base-ui Button does not support asChild; use render prop */}
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon"
            className="relative"
            render={<Link href="/cart" />}
          >
            <ShoppingCart className="h-5 w-5" />
            <CartCount />
          </Button>

          {/* Mobile Hamburger — client component (needs Sheet state) */}
          <NavMobileMenu categories={categories} />
        </div>

      </div>
    </header>
  );
}
