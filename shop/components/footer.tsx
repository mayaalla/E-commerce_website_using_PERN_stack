import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import type { Category } from "@/lib/api";

const links = [
  { label: "À propos", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Politique de confidentialité", href: "/privacy" },
  { label: "Conditions d’utilisation", href: "/terms" },
];

interface FooterProps {
  categories: Category[];
}

const year = new Date().getFullYear();

export default function Footer({ categories }: FooterProps) {

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="font-[family-name:var(--font-tenor-sans)] text-xl font-bold tracking-tight">
              MAISON
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Votre destination pour le streetwear et la mode de qualité. Des pièces choisies, un style intemporel.
            </p>
          </div>

          {/* Catégories */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Catégories
            </h3>
            <ul className="flex flex-col gap-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Informations
            </h3>
            <ul className="flex flex-col gap-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {year} MAISON. Tous droits réservés.</p>
          <p>Fait avec amour</p>
        </div>
      </div>
    </footer>
  );
}
