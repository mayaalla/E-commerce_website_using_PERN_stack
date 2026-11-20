// Type declarations for shadcn/ui JSX components
// These are JSX files so we provide loose typings to avoid className required errors

import * as React from "react";

type AnyProps = { className?: string; [key: string]: any };

declare module "@/components/ui/button" {
  export const Button: React.FC<AnyProps>;
  export const buttonVariants: (opts: AnyProps) => string;
}

declare module "@/components/ui/card" {
  export const Card: React.FC<AnyProps>;
  export const CardHeader: React.FC<AnyProps>;
  export const CardTitle: React.FC<AnyProps>;
  export const CardDescription: React.FC<AnyProps>;
  export const CardAction: React.FC<AnyProps>;
  export const CardContent: React.FC<AnyProps>;
  export const CardFooter: React.FC<AnyProps>;
}

declare module "@/components/ui/badge" {
  export const Badge: React.FC<AnyProps>;
  export const badgeVariants: (opts: AnyProps) => string;
}

declare module "@/components/ui/skeleton" {
  export const Skeleton: React.FC<AnyProps>;
}

declare module "@/components/ui/separator" {
  export const Separator: React.FC<AnyProps>;
}

declare module "@/components/ui/alert-dialog" {
  export const AlertDialog: React.FC<AnyProps>;
  export const AlertDialogTrigger: React.FC<AnyProps>;
  export const AlertDialogContent: React.FC<AnyProps>;
  export const AlertDialogHeader: React.FC<AnyProps>;
  export const AlertDialogFooter: React.FC<AnyProps>;
  export const AlertDialogTitle: React.FC<AnyProps>;
  export const AlertDialogDescription: React.FC<AnyProps>;
  export const AlertDialogAction: React.FC<AnyProps>;
  export const AlertDialogCancel: React.FC<AnyProps>;
  export const AlertDialogOverlay: React.FC<AnyProps>;
  export const AlertDialogPortal: React.FC<AnyProps>;
  export const AlertDialogMedia: React.FC<AnyProps>;
}

declare module "@/components/ui/dialog" {
  export const Dialog: React.FC<AnyProps>;
  export const DialogTrigger: React.FC<AnyProps>;
  export const DialogContent: React.FC<AnyProps>;
  export const DialogHeader: React.FC<AnyProps>;
  export const DialogFooter: React.FC<AnyProps>;
  export const DialogTitle: React.FC<AnyProps>;
  export const DialogDescription: React.FC<AnyProps>;
}

declare module "@/components/ui/select" {
  export const Select: React.FC<AnyProps>;
  export const SelectTrigger: React.FC<AnyProps>;
  export const SelectValue: React.FC<AnyProps>;
  export const SelectContent: React.FC<AnyProps>;
  export const SelectItem: React.FC<AnyProps>;
  export const SelectGroup: React.FC<AnyProps>;
  export const SelectLabel: React.FC<AnyProps>;
}

declare module "@/components/ui/input" {
  export const Input: React.FC<AnyProps>;
}

declare module "@/components/ui/label" {
  export const Label: React.FC<AnyProps>;
}

declare module "@/components/ui/table" {
  export const Table: React.FC<AnyProps>;
  export const TableHeader: React.FC<AnyProps>;
  export const TableBody: React.FC<AnyProps>;
  export const TableFooter: React.FC<AnyProps>;
  export const TableRow: React.FC<AnyProps>;
  export const TableHead: React.FC<AnyProps>;
  export const TableCell: React.FC<AnyProps>;
  export const TableCaption: React.FC<AnyProps>;
}

declare module "@/components/ui/dropdown-menu" {
  export const DropdownMenu: React.FC<AnyProps>;
  export const DropdownMenuTrigger: React.FC<AnyProps>;
  export const DropdownMenuContent: React.FC<AnyProps>;
  export const DropdownMenuItem: React.FC<AnyProps>;
  export const DropdownMenuLabel: React.FC<AnyProps>;
  export const DropdownMenuSeparator: React.FC<AnyProps>;
}

declare module "@/components/ui/sonner" {
  export const Toaster: React.FC<AnyProps>;
}

declare module "@/components/ui/form" {
  export const Form: React.FC<AnyProps>;
  export const FormField: React.FC<AnyProps>;
  export const FormItem: React.FC<AnyProps>;
  export const FormLabel: React.FC<AnyProps>;
  export const FormControl: React.FC<AnyProps>;
  export const FormDescription: React.FC<AnyProps>;
  export const FormMessage: React.FC<AnyProps>;
}
