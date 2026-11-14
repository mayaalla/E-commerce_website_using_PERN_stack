import * as React from "react";
import { useState } from "react";
import { Loader2, Trash2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useDeleteOrder, useUpdateOrderStatus } from "@/features/orders";

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: "Pending",   className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary border-primary/30" },
  shipped:   { label: "Shipped",   className: "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400" },
  canceled:  { label: "Canceled",  className: "bg-destructive/15 text-destructive border-destructive/30" },
  returned:  { label: "Returned",  className: "bg-muted text-muted-foreground border-border" },
};

// Terminal statuses cannot be updated further
const TERMINAL = new Set(["canceled", "returned"]);

// Valid next statuses per current status
const NEXT_STATUSES = {
  pending:   ["confirmed", "canceled"],
  confirmed: ["shipped",   "canceled"],
  shipped:   ["returned"],
  canceled:  [],
  returned:  [],
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "border-border" };
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

// ─── OrderRow ─────────────────────────────────────────────────────────────────
function OrderRow({ order }) {
  const { mutate: deleteOrder, isPending: isDeleting } = useDeleteOrder();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const isBusy = isDeleting || isUpdating;
  const isTerminal = TERMINAL.has(order.status);
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];

  function handleDelete() {
    deleteOrder(order.id);
  }

  function handleStatusChange(status) {
    updateStatus({ id: order.id, data: { status } });
  }

  // Format total as DZD
  const totalDisplay = `${parseFloat(order.total).toLocaleString("fr-DZ")} DZD`;

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      {/* ID */}
      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
        #{order.id}
      </TableCell>

      {/* Customer */}
      <TableCell>
        <div className="font-medium leading-tight">{order.name}</div>
        <div className="text-xs text-muted-foreground">{order.phoneNumber}</div>
      </TableCell>

      {/* Location */}
      <TableCell className="text-sm text-muted-foreground">
        Wilaya {order.wilayaCode}
      </TableCell>

      {/* Products count */}
      <TableCell className="text-sm tabular-nums text-center">
        {order.products.length}
      </TableCell>

      {/* Total */}
      <TableCell className="text-sm font-semibold tabular-nums">
        {totalDisplay}
      </TableCell>

      {/* Date */}
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        <div>{order.date}</div>
        <div className="text-muted-foreground/70">{order.hour}</div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Status changer — only shown for non-terminal orders */}
          {!isTerminal && nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {isUpdating ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3" aria-hidden="true" />
                  )}
                  Update
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="capitalize"
                  >
                    Mark as {STATUS_CONFIG[s]?.label ?? s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Soft-delete — behind AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={`Archive order #${order.id}`}
                title={isDeleting ? "Archiving…" : "Archive order"}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive order #{order.id}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will soft-delete the order for{" "}
                  <strong>{order.name}</strong>. It will be hidden from the
                  dashboard but kept in the database for revenue reporting.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── OrderTable ───────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one OrderRow per active order.
// Lives inside the OrderPannel Card — no extra wrapper border needed.
// ─────────────────────────────────────────────────────────────────────────────
function OrderTable({ orders }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No orders yet. Place one above to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-b bg-muted/50">
          <TableHead className="pl-6 w-16 text-xs uppercase tracking-wider text-muted-foreground">
            ID
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Customer
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Location
          </TableHead>
          <TableHead className="w-20 text-center text-xs uppercase tracking-wider text-muted-foreground">
            Items
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Total
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Date
          </TableHead>
          <TableHead className="w-32 text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="pr-6 w-36 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </TableBody>
    </Table>
  );
}

export default OrderTable;
