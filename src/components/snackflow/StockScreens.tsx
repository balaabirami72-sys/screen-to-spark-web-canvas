import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/snackflow";
import { formatMoney, formatQuantity, formatShortDate, useItemsQuery } from "@/lib/snackflow-data";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "./Shared";

type BalanceRow = {
  item_id: string | null;
  item_name: string | null;
  item_type: string | null;
  base_unit: string | null;
  balance: number | null;
  movement_count: number | null;
};

export function StockSummaryScreen({ canAdjust }: { canAdjust: boolean }) {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const balanceQuery = useQuery({
    queryKey: ["stock-balance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_balance_summary")
        .select("item_id,item_name,item_type,base_unit,balance,movement_count")
        .order("item_name");
      if (error) throw error;
      return data as BalanceRow[];
    },
  });

  const balances = balanceQuery.data ?? [];
  const finishedCount = balances.filter((row) => row.item_type === "finished").length;
  const ledgerRows = balances.reduce((total, row) => total + (row.movement_count ?? 0), 0);

  return (
    <>
      <ScreenHeader
        action={
          canAdjust ? (
            <Button onClick={() => setAdjustmentOpen(true)} type="button">
              <Plus aria-hidden="true" />
              Stock adjustment
            </Button>
          ) : null
        }
        description="On-hand quantities, calculated from the movement ledger."
        eyebrow="Inventory"
        title="Stock summary"
      />

      {balanceQuery.isPending ? <LoadingState label="Loading stock" /> : null}
      {balanceQuery.isError ? <ErrorState label="Stock balances could not be loaded." /> : null}

      {balanceQuery.data ? (
        <>
          <div className="grid border-y border-border sm:grid-cols-3">
            <SummaryMetric label="Items tracked" value={String(balances.length)} />
            <SummaryMetric label="Finished SKUs" value={String(finishedCount)} />
            <SummaryMetric label="Ledger entries" value={String(ledgerRows)} />
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Current balances</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each value is the sum of its stock movements.
                </p>
              </div>
            </div>
            {balances.length === 0 ? (
              <EmptyState title="No items have been added yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Movements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((row) => (
                    <TableRow key={row.item_id ?? row.item_name}>
                      <TableCell className="font-medium">
                        {row.item_name ?? "Unnamed item"}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                          {typeLabel(row.item_type)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${Number(row.balance) < 0 ? "text-destructive" : "text-foreground"}`}
                      >
                        {formatQuantity(row.balance)}{" "}
                        <span className="font-normal text-muted-foreground">{row.base_unit}</span>
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                        {row.movement_count ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      ) : null}

      <StockAdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} />
    </>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-4 py-5 sm:border-b-0 sm:border-r last:border-r-0">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function StockLedgerScreen({ roles }: { roles: readonly AppRole[] }) {
  const canAdjust = roles.some(
    (role) => role === "admin" || role === "owner" || role === "production",
  );
  const [filterItem, setFilterItem] = useState("all");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const itemsQuery = useItemsQuery();
  const movementQuery = useQuery({
    queryKey: ["stock-movements", filterItem],
    queryFn: async () => {
      let request = supabase
        .from("stock_movements")
        .select("id,item_id,batch_no,quantity,rate,source_type,source_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filterItem !== "all") request = request.eq("item_id", filterItem);
      const { data, error } = await request;
      if (error) throw error;
      return data;
    },
  });
  const itemNames = new Map((itemsQuery.data ?? []).map((item) => [item.id, item.name]));

  return (
    <>
      <ScreenHeader
        action={
          canAdjust ? (
            <Button onClick={() => setAdjustmentOpen(true)} type="button">
              <Plus aria-hidden="true" />
              Stock adjustment
            </Button>
          ) : null
        }
        description="An append-only record of opening quantities and later adjustments."
        eyebrow="Inventory"
        title="Stock ledger"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          <span>Filter item</span>
        </div>
        <Select onValueChange={setFilterItem} value={filterItem}>
          <SelectTrigger aria-label="Filter stock ledger by item" className="w-full sm:w-64">
            <SelectValue placeholder="All items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            {(itemsQuery.data ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {movementQuery.isPending ? <LoadingState label="Loading movements" /> : null}
      {movementQuery.isError ? <ErrorState label="Stock movements could not be loaded." /> : null}
      {movementQuery.data ? (
        movementQuery.data.length === 0 ? (
          <EmptyState title="No stock movements match this item." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Rate</TableHead>
                <TableHead className="hidden sm:table-cell">Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementQuery.data.map((movement) => {
                const unit = itemsQuery.data?.find(
                  (item) => item.id === movement.item_id,
                )?.base_unit;
                return (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatShortDate(movement.created_at)}
                    </TableCell>
                    <TableCell className="min-w-36 font-medium">
                      {itemNames.get(movement.item_id) ?? "Unknown item"}
                    </TableCell>
                    <TableCell>{sourceLabel(movement.source_type)}</TableCell>
                    <TableCell
                      className={`whitespace-nowrap text-right font-semibold ${movement.quantity < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {formatQuantity(movement.quantity)}
                      <span className="ml-1 font-normal text-muted-foreground">{unit}</span>
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {formatMoney(movement.rate)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {movement.batch_no ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      ) : null}

      <StockAdjustmentDialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen} />
    </>
  );
}

function StockAdjustmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const itemsQuery = useItemsQuery();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("0");
  const [batchNo, setBatchNo] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const decimal = /^-?\d+(?:\.\d{1,4})?$/;
    if (!itemId || !decimal.test(quantity) || Number(quantity) === 0) {
      setFormError("Choose an item and enter a non-zero quantity.");
      return;
    }
    if (!decimal.test(rate) || Number(rate) < 0) {
      setFormError("Enter a valid non-negative rate.");
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setFormError("Your sign-in expired. Please sign in again.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("stock_movements").insert({
      item_id: itemId,
      quantity: Number(quantity),
      rate: Number(rate),
      batch_no: batchNo.trim() || null,
      source_type: "adjustment",
      created_by: authData.user.id,
    });
    setBusy(false);

    if (error) {
      setFormError("The adjustment could not be saved. Check your access and try again.");
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] }),
    ]);
    setQuantity("");
    setRate("0");
    setBatchNo("");
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record stock adjustment</DialogTitle>
          <DialogDescription>A new movement will be added to the stock ledger.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submitAdjustment}>
          <label className="block space-y-2 text-sm font-medium">
            Item
            <Select onValueChange={setItemId} value={itemId}>
              <SelectTrigger aria-label="Select item">
                <SelectValue placeholder="Choose an item" />
              </SelectTrigger>
              <SelectContent>
                {(itemsQuery.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} · {item.base_unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Signed quantity
              <Input
                inputMode="decimal"
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="e.g. 12 or -4"
                value={quantity}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Rate per unit (₹)
              <Input
                inputMode="decimal"
                onChange={(event) => setRate(event.target.value)}
                value={rate}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            Batch number <span className="font-normal text-muted-foreground">Optional</span>
            <Input onChange={(event) => setBatchNo(event.target.value)} value={batchNo} />
          </label>
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function typeLabel(type: string | null) {
  if (type === "raw") return "Raw material";
  if (type === "packaging") return "Packaging";
  if (type === "finished") return "Finished goods";
  return "Other";
}

function sourceLabel(source: string) {
  if (source === "opening_balance") return "Opening balance";
  if (source === "adjustment") return "Adjustment";
  if (source === "production") return "Production";
  if (source === "purchase") return "Purchase";
  if (source === "invoice") return "Invoice";
  if (source === "credit_note") return "Credit note";
  return source;
}
