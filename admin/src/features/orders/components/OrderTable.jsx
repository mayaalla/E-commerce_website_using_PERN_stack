import * as React from "react";
import { Loader2, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useGetCommunes } from "@/features/communes/hooks/useGetCommunes";
import { useDeleteOrder, useUpdateOrderStatus } from "@/features/orders";
import { useGetWilayas } from "@/features/wilaya";
import EditOrderWindow from "./EditOrderWindow";
import OrderDetailsDialogContent from "./OrderDetailsDialogContent";

// ─── Status select config ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: "Pending",   className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary border-primary/30" },
  delivered: { label: "Delivered", className: "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400", disabledClassName: "bg-green-500/8 text-green-500/60 border-green-500/15 dark:text-green-400/50 opacity-75" },
  canceled:  { label: "Canceled",  className: "bg-destructive/15 text-destructive border-destructive/30" },
  returned:  { label: "Returned",  className: "bg-muted text-muted-foreground border-border" },
};

// Terminal statuses cannot be updated further
const TERMINAL = new Set(["canceled", "returned", "delivered"]);

// ─── OrderRow ─────────────────────────────────────────────────────────────────
function OrderRow({ order, communeName, communesLoading, wilayaName, wilayasLoading }) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const { mutate: deleteOrder, isPending: isDeleting } = useDeleteOrder();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const isBusy = isDeleting || isUpdating;
  const isTerminal = TERMINAL.has(order.status);
  const statusConfig = STATUS_CONFIG[order.status] ?? {
    label: order.status,
    className: "bg-muted text-muted-foreground border-border",
  };

  function handleDelete() {
    deleteOrder(order.id);
  }

  function handleStatusChange(status) {
    updateStatus({ id: order.id, data: { status } });
  }

  // Format total as DZD
  const totalDisplay = `${parseFloat(order.total).toLocaleString("fr-DZ")} DZD`;

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <TableRow className="hover:bg-muted/40 transition-colors">
      {/* ID */}
      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={`View details for order #${order.id}`}
            className="h-auto p-0 cursor-pointer font-mono text-xs text-primary underline underline-offset-4 hover:text-primary"
          >
            #{order.id}
          </Button>
        </DialogTrigger>
      </TableCell>

      {/* Customer */}
      <TableCell>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-label={`View order details for ${order.name}`}
            className="h-auto cursor-pointer justify-start p-0 text-left font-medium leading-tight text-foreground hover:text-primary"
          >
            {order.name}
          </Button>
        </DialogTrigger>
        <div className="text-xs text-muted-foreground">{order.phoneNumber}</div>
      </TableCell>

      {/* Location */}
      <TableCell className="text-sm text-muted-foreground">
        {wilayasLoading ? "Loading…" : wilayaName ?? "—"}
      </TableCell>

      {/* Commune */}
      <TableCell className="text-sm text-muted-foreground">
        {communesLoading ? "Loading…" : communeName ?? "—"}
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
        {isTerminal ? (
          /* Terminal statuses (delivered, canceled, returned) are immutable –
             render a plain styled badge so the value is always visible. */
          <div
            className={`inline-flex h-8 w-[132px] items-center justify-between gap-1 rounded-md border px-2 text-xs font-medium ${
              order.status === "delivered"
                ? (statusConfig.disabledClassName ?? statusConfig.className)
                : statusConfig.className
            } opacity-75 cursor-not-allowed select-none`}
          >
            <span>{statusConfig.label}</span>
          </div>
        ) : (
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={isBusy}
          >
            <SelectTrigger
              aria-label={`Update status for order #${order.id}`}
              className={`h-8 w-[132px] gap-1 px-2 text-xs cursor-default ${statusConfig.className}`}
            >
              {isUpdating && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <SelectItem
                  key={status}
                  value={status}
                  disabled={status === order.status}
                  className={`my-1 ${config.className}`}
                >
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          <EditOrderWindow order={order} disabled={isBusy} />

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
      {detailsOpen && (
        <OrderDetailsDialogContent
          order={order}
          wilayaName={wilayaName}
          wilayasLoading={wilayasLoading}
          communeName={communeName}
          communesLoading={communesLoading}
        />
      )}
    </Dialog>
  );
}

// ─── OrderTable ───────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one OrderRow per active order.
// Pagination lives in <tfoot> — visually connected to the data rows.
// ─────────────────────────────────────────────────────────────────────────────

// ─── TablePagination ─────────────────────────────────────────────────────────
function TablePagination({ page, totalPages, total, limit, onPageChange }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pages = [];
  const delta = 1;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);
  if (left > 1) { pages.push(1); if (left > 2) pages.push("…"); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push("…"); pages.push(totalPages); }

  return (
    <tfoot>
      <tr className="border-t border-border bg-muted/30">
        <td colSpan={9} className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Result count */}
            <p className="text-xs text-muted-foreground tabular-nums shrink-0">
              {total === 0
                ? "No results"
                : `${from}–${to} of ${total} orders`}
            </p>

            {/* Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>

                {/* Page numbers */}
                {pages.map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`el-${i}`}
                      className="flex size-7 items-center justify-center text-xs text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      aria-current={p === page ? "page" : undefined}
                      className={[
                        "inline-flex size-7 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                        p === page
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    </tfoot>
  );
}

function OrderTable({ orders, page, totalPages, total, limit, onPageChange }) {
  const { data: communesResponse, isLoading: communesLoading } = useGetCommunes();
  const { data: wilayasResponse, isLoading: wilayasLoading } = useGetWilayas();
  const communesById = React.useMemo(
    () => new Map((communesResponse?.data ?? []).map(({ id, name }) => [id, name])),
    [communesResponse?.data],
  );
  const wilayasByCode = React.useMemo(
    () => new Map((wilayasResponse?.data ?? []).map(({ code, name }) => [code, name])),
    [wilayasResponse?.data],
  );

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
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Commune
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
          <TableHead className="w-36 text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="pr-6 w-20 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            communeName={communesById.get(order.communeId)}
            communesLoading={communesLoading}
            wilayaName={wilayasByCode.get(order.wilayaCode)}
            wilayasLoading={wilayasLoading}
          />
        ))}
      </TableBody>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
      />
    </Table>
  );
}

export default OrderTable;
