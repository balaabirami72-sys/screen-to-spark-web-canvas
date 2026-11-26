import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

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
import type { Tables } from "@/integrations/supabase/types";
import type { AppRole } from "@/lib/snackflow";
import { formatQuantity, formatShortDate, type ItemRow, useItemsQuery } from "@/lib/snackflow-data";
import { roleLabels } from "@/lib/snackflow";
import { EmptyState, ErrorState, LoadingState, ScreenHeader } from "./Shared";

type ItemType = "raw" | "packaging" | "finished";
type CustomerType = "retailer" | "distributor";
type PriceListRow = Tables<"price_lists">;
type CustomerRow = Tables<"customers">;
type SupplierRow = Tables<"suppliers">;
type BomRow = Tables<"boms">;
type BomLineRow = Tables<"bom_lines">;
type InviteRow = Tables<"staff_role_invites">;

export function ItemsScreen({ canEdit }: { canEdit: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const itemsQuery = useItemsQuery();

  function openNew() {
    setSelectedItem(null);
    setDialogOpen(true);
  }

  return (
    <>
      <ScreenHeader
        action={
          canEdit ? (
            <Button onClick={openNew} type="button">
              <Plus aria-hidden="true" />
              New item
            </Button>
          ) : null
        }
        description="Raw materials, packaging and finished goods."
        eyebrow="Master data"
        title="Items"
      />
      {itemsQuery.isPending ? <LoadingState label="Loading items" /> : null}
      {itemsQuery.isError ? <ErrorState label="Items could not be loaded." /> : null}
      {itemsQuery.data ? (
        itemsQuery.data.length === 0 ? (
          <EmptyState
            title="No items have been added yet."
            action={canEdit ? <Button onClick={openNew}>Add the first item</Button> : null}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="hidden sm:table-cell">HSN</TableHead>
                <TableHead className="text-right">GST</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {itemTypeLabel(item.type)}
                    </span>
                  </TableCell>
                  <TableCell>{item.base_unit}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {item.hsn_code ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{item.gst_rate}%</TableCell>
                  {canEdit ? (
                    <TableCell>
                      <Button
                        aria-label={`Edit ${item.name}`}
                        onClick={() => {
                          setSelectedItem(item);
                          setDialogOpen(true);
                        }}
                        size="icon"
                        title="Edit item"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}
      {canEdit ? (
        <ItemDialog item={selectedItem} onOpenChange={setDialogOpen} open={dialogOpen} />
      ) : null}
    </>
  );
}

function ItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ItemRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("raw");
  const [unit, setUnit] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstRate, setGstRate] = useState("0");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setType((item?.type as ItemType | undefined) ?? "raw");
    setUnit(item?.base_unit ?? "");
    setHsn(item?.hsn_code ?? "");
    setGstRate(String(item?.gst_rate ?? 0));
    setErrorText("");
  }, [item, open]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    if (!name.trim() || !unit.trim() || !/^\d+(?:\.\d{1,3})?$/.test(gstRate)) {
      setErrorText("Enter an item name, unit and valid GST rate.");
      return;
    }

    setBusy(true);
    const values = {
      name: name.trim(),
      type,
      base_unit: unit.trim(),
      hsn_code: hsn.trim() || null,
      gst_rate: Number(gstRate),
    };
    const result = item
      ? await supabase.from("items").update(values).eq("id", item.id)
      : await supabase.from("items").insert(values);
    setBusy(false);

    if (result.error) {
      setErrorText("The item could not be saved. Check for duplicate names and try again.");
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["items"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-balance"] }),
    ]);
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>Item details and tax classification.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <label className="block space-y-2 text-sm font-medium">
            Name
            <Input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Type
              <Select onValueChange={(value) => setType(value as ItemType)} value={type}>
                <SelectTrigger aria-label="Item type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">Raw material</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="finished">Finished goods</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Base unit
              <Input
                onChange={(event) => setUnit(event.target.value)}
                placeholder="kg, L, packet"
                required
                value={unit}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              HSN code
              <Input onChange={(event) => setHsn(event.target.value)} value={hsn} />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              GST rate (%)
              <Input
                inputMode="decimal"
                onChange={(event) => setGstRate(event.target.value)}
                value={gstRate}
              />
            </label>
          </div>
          {errorText ? (
            <p className="text-sm text-destructive" role="alert">
              {errorText}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomersScreen({ canEdit }: { canEdit: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  const priceListsQuery = useQuery({
    queryKey: ["price-lists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_lists").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <ScreenHeader
        action={
          canEdit ? (
            <Button
              onClick={() => {
                setSelectedCustomer(null);
                setDialogOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" />
              New customer
            </Button>
          ) : null
        }
        description="Retailers and distributors with their state and price list."
        eyebrow="Master data"
        title="Customers"
      />
      {customersQuery.isPending ? <LoadingState label="Loading customers" /> : null}
      {customersQuery.isError ? <ErrorState label="Customers could not be loaded." /> : null}
      {customersQuery.data ? (
        customersQuery.data.length === 0 ? (
          <EmptyState title="No customers have been added yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="hidden sm:table-cell">GSTIN</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="capitalize">{customer.type}</TableCell>
                  <TableCell>{customer.state_code}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {customer.gstin ?? "—"}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <Button
                        aria-label={`Edit ${customer.name}`}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setDialogOpen(true);
                        }}
                        size="icon"
                        title="Edit customer"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}
      {canEdit ? (
        <CustomerDialog
          customer={selectedCustomer}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          priceLists={priceListsQuery.data ?? []}
        />
      ) : null}
    </>
  );
}

function CustomerDialog({
  customer,
  open,
  onOpenChange,
  priceLists,
}: {
  customer: CustomerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceLists: PriceListRow[];
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomerType>("retailer");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [priceListId, setPriceListId] = useState("");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setType((customer?.type as CustomerType | undefined) ?? "retailer");
    setGstin(customer?.gstin ?? "");
    setStateCode(customer?.state_code ?? "");
    setPriceListId(customer?.price_list_id ?? "");
    setErrorText("");
  }, [customer, open]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    if (!name.trim() || !/^\d{2}$/.test(stateCode.trim())) {
      setErrorText("Enter a customer name and a two-digit state code.");
      return;
    }

    setBusy(true);
    const values = {
      name: name.trim(),
      type,
      gstin: gstin.trim() || null,
      state_code: stateCode.trim(),
      price_list_id: priceListId || null,
    };
    const result = customer
      ? await supabase.from("customers").update(values).eq("id", customer.id)
      : await supabase.from("customers").insert(values);
    setBusy(false);

    if (result.error) {
      setErrorText("The customer could not be saved. Check for duplicate details and try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>Customer identity and tax state.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <label className="block space-y-2 text-sm font-medium">
            Name
            <Input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Type
              <Select onValueChange={(value) => setType(value as CustomerType)} value={type}>
                <SelectTrigger aria-label="Customer type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              State code
              <Input
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => setStateCode(event.target.value)}
                required
                value={stateCode}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            GSTIN
            <Input onChange={(event) => setGstin(event.target.value.toUpperCase())} value={gstin} />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Price list
            <Select onValueChange={setPriceListId} value={priceListId}>
              <SelectTrigger aria-label="Customer price list">
                <SelectValue placeholder="No price list" />
              </SelectTrigger>
              <SelectContent>
                {priceLists.map((priceList) => (
                  <SelectItem key={priceList.id} value={priceList.id}>
                    {priceList.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {errorText ? (
            <p className="text-sm text-destructive" role="alert">
              {errorText}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SuppliersScreen({ canEdit }: { canEdit: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);
  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <ScreenHeader
        action={
          canEdit ? (
            <Button
              onClick={() => {
                setSelectedSupplier(null);
                setDialogOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" />
              New supplier
            </Button>
          ) : null
        }
        description="Supplier names, tax state and contact numbers."
        eyebrow="Master data"
        title="Suppliers"
      />
      {suppliersQuery.isPending ? <LoadingState label="Loading suppliers" /> : null}
      {suppliersQuery.isError ? <ErrorState label="Suppliers could not be loaded." /> : null}
      {suppliersQuery.data ? (
        suppliersQuery.data.length === 0 ? (
          <EmptyState title="No suppliers have been added yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="hidden sm:table-cell">GSTIN</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                {canEdit ? <TableHead className="w-12" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersQuery.data.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.state_code ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {supplier.gstin ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {supplier.phone ?? "—"}
                  </TableCell>
                  {canEdit ? (
                    <TableCell>
                      <Button
                        aria-label={`Edit ${supplier.name}`}
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setDialogOpen(true);
                        }}
                        size="icon"
                        title="Edit supplier"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : null}
      {canEdit ? (
        <SupplierDialog
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          supplier={selectedSupplier}
        />
      ) : null}
    </>
  );
}

function SupplierDialog({
  supplier,
  open,
  onOpenChange,
}: {
  supplier: SupplierRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setGstin(supplier?.gstin ?? "");
    setStateCode(supplier?.state_code ?? "");
    setPhone(supplier?.phone ?? "");
    setErrorText("");
  }, [open, supplier]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setErrorText("Enter a supplier name.");
      return;
    }
    setErrorText("");
    setBusy(true);
    const values = {
      name: name.trim(),
      gstin: gstin.trim() || null,
      state_code: stateCode.trim() || null,
      phone: phone.trim() || null,
    };
    const result = supplier
      ? await supabase.from("suppliers").update(values).eq("id", supplier.id)
      : await supabase.from("suppliers").insert(values);
    setBusy(false);

    if (result.error) {
      setErrorText("The supplier could not be saved. Check for a duplicate name and try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>Supplier identity and contact details.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <label className="block space-y-2 text-sm font-medium">
            Name
            <Input onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              State code
              <Input
                inputMode="numeric"
                maxLength={2}
                onChange={(event) => setStateCode(event.target.value)}
                value={stateCode}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Phone
              <Input
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                value={phone}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            GSTIN
            <Input onChange={(event) => setGstin(event.target.value.toUpperCase())} value={gstin} />
          </label>
          {errorText ? (
            <p className="text-sm text-destructive" role="alert">
              {errorText}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={busy} type="submit">
              {busy ? "Saving…" : "Save supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type BomLineWithItem = BomLineRow & { item: ItemRow | undefined };
type BomWithLines = BomRow & { product: ItemRow | undefined; lines: BomLineWithItem[] };

export function BomScreen({ canEdit }: { canEdit: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<BomWithLines | null>(null);
  const itemsQuery = useItemsQuery();
  const bomQuery = useQuery({
    queryKey: ["boms"],
    queryFn: async () => {
      const [bomsResult, linesResult, itemsResult] = await Promise.all([
        supabase.from("boms").select("*").order("created_at"),
        supabase.from("bom_lines").select("*"),
        supabase.from("items").select("*"),
      ]);
      if (bomsResult.error) throw bomsResult.error;
      if (linesResult.error) throw linesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      const itemMap = new Map(itemsResult.data.map((item) => [item.id, item]));
      return bomsResult.data.map((bom) => ({
        ...bom,
        product: itemMap.get(bom.product_id),
        lines: linesResult.data
          .filter((line) => line.bom_id === bom.id)
          .map((line) => ({ ...line, item: itemMap.get(line.item_id) })),
      }));
    },
  });

  return (
    <>
      <ScreenHeader
        action={
          canEdit ? (
            <Button
              onClick={() => {
                setSelectedBom(null);
                setDialogOpen(true);
              }}
              type="button"
            >
              <Plus aria-hidden="true" />
              New BOM
            </Button>
          ) : null
        }
        description="Expected yield and standard ingredient quantities for each product."
        eyebrow="Master data"
        title="BOM recipes"
      />
      {bomQuery.isPending || itemsQuery.isPending ? <LoadingState label="Loading recipes" /> : null}
      {bomQuery.isError || itemsQuery.isError ? (
        <ErrorState label="Recipes could not be loaded." />
      ) : null}
      {bomQuery.data ? (
        bomQuery.data.length === 0 ? (
          <EmptyState title="No BOM recipes have been added yet." />
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {bomQuery.data.map((bom) => (
              <section className="py-5" key={bom.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold">
                      {bom.product?.name ?? "Unknown product"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Yield {formatQuantity(bom.expected_yield)} {bom.yield_unit} ·{" "}
                      {bom.lines.length} ingredients
                    </p>
                  </div>
                  {canEdit ? (
                    <Button
                      onClick={() => {
                        setSelectedBom(bom);
                        setDialogOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Pencil aria-hidden="true" />
                      Edit recipe
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {bom.lines.map((line) => (
                    <div
                      className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2 text-sm"
                      key={line.id}
                    >
                      <span className="text-muted-foreground">
                        {line.item?.name ?? "Unknown ingredient"}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatQuantity(line.standard_quantity)} {line.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : null}
      {canEdit ? (
        <BomEditorDialog
          bom={selectedBom}
          items={itemsQuery.data ?? []}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
        />
      ) : null}
    </>
  );
}

type BomLineDraft = { item_id: string; standard_quantity: string; unit: string };

function BomEditorDialog({
  bom,
  items,
  open,
  onOpenChange,
}: {
  bom: BomWithLines | null;
  items: ItemRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const products = items.filter((item) => item.type === "finished");
  const ingredients = items.filter((item) => item.type === "raw" || item.type === "packaging");
  const [productId, setProductId] = useState("");
  const [expectedYield, setExpectedYield] = useState("");
  const [yieldUnit, setYieldUnit] = useState("packet");
  const [lines, setLines] = useState<BomLineDraft[]>([]);
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProductId(bom?.product_id ?? products[0]?.id ?? "");
    setExpectedYield(String(bom?.expected_yield ?? ""));
    setYieldUnit(bom?.yield_unit ?? products[0]?.base_unit ?? "packet");
    setLines(
      bom?.lines.map((line) => ({
        item_id: line.item_id,
        standard_quantity: String(line.standard_quantity),
        unit: line.unit,
      })) ?? [],
    );
    setErrorText("");
  }, [bom, open, products]);

  function addIngredient() {
    const firstIngredient = ingredients[0];
    if (!firstIngredient) return;
    setLines((current) => [
      ...current,
      { item_id: firstIngredient.id, standard_quantity: "", unit: firstIngredient.base_unit },
    ]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    const decimal = /^\d+(?:\.\d{1,4})?$/;
    if (
      !productId ||
      !decimal.test(expectedYield) ||
      Number(expectedYield) <= 0 ||
      !yieldUnit.trim()
    ) {
      setErrorText("Choose a finished item and enter a positive yield and unit.");
      return;
    }
    if (
      lines.length === 0 ||
      lines.some(
        (line) =>
          !line.item_id ||
          !decimal.test(line.standard_quantity) ||
          Number(line.standard_quantity) <= 0 ||
          !line.unit.trim(),
      )
    ) {
      setErrorText("Each recipe line needs an ingredient, positive quantity and unit.");
      return;
    }

    setBusy(true);
    const rpcPayload = {
      p_product_id: productId,
      p_expected_yield: Number(expectedYield),
      p_yield_unit: yieldUnit.trim(),
      p_lines: lines.map((line) => ({
        item_id: line.item_id,
        standard_quantity: Number(line.standard_quantity),
        unit: line.unit.trim(),
      })),
    };
    const { error } = await supabase.rpc(
      "save_bom",
      bom ? { ...rpcPayload, p_bom_id: bom.id } : rpcPayload,
    );
    setBusy(false);

    if (error) {
      setErrorText("The recipe could not be saved. Check its ingredients and try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["boms"] });
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bom ? "Edit BOM recipe" : "New BOM recipe"}</DialogTitle>
          <DialogDescription>Standard ingredients for one production batch.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Finished item
              <Select onValueChange={setProductId} value={productId}>
                <SelectTrigger aria-label="Finished item">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Expected yield
              <Input
                inputMode="decimal"
                onChange={(event) => setExpectedYield(event.target.value)}
                value={expectedYield}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            Yield unit
            <Input onChange={(event) => setYieldUnit(event.target.value)} value={yieldUnit} />
          </label>

          <div className="border-t border-border pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Ingredients</h3>
              <Button onClick={addIngredient} size="sm" type="button" variant="outline">
                <Plus aria-hidden="true" />
                Add ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.6fr)_minmax(4.5rem,0.5fr)_2.25rem] items-end gap-2"
                  key={`${line.item_id}-${index}`}
                >
                  <label className="min-w-0 space-y-2 text-xs font-medium">
                    Ingredient
                    <Select
                      onValueChange={(value) => {
                        const selected = ingredients.find((item) => item.id === value);
                        setLines((current) =>
                          current.map((draft, lineIndex) =>
                            lineIndex === index
                              ? {
                                  ...draft,
                                  item_id: value,
                                  unit: selected?.base_unit ?? draft.unit,
                                }
                              : draft,
                          ),
                        );
                      }}
                      value={line.item_id}
                    >
                      <SelectTrigger aria-label={`Ingredient ${index + 1}`}>
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-2 text-xs font-medium">
                    Quantity
                    <Input
                      inputMode="decimal"
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((draft, lineIndex) =>
                            lineIndex === index
                              ? { ...draft, standard_quantity: event.target.value }
                              : draft,
                          ),
                        )
                      }
                      value={line.standard_quantity}
                    />
                  </label>
                  <label className="space-y-2 text-xs font-medium">
                    Unit
                    <Input
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((draft, lineIndex) =>
                            lineIndex === index ? { ...draft, unit: event.target.value } : draft,
                          ),
                        )
                      }
                      value={line.unit}
                    />
                  </label>
                  <Button
                    aria-label={`Remove ingredient ${index + 1}`}
                    onClick={() =>
                      setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
                    }
                    size="icon"
                    title="Remove ingredient"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {lines.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No ingredients added.</p>
              ) : null}
            </div>
          </div>

          {errorText ? (
            <p className="text-sm text-destructive" role="alert">
              {errorText}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={busy || products.length === 0 || ingredients.length === 0}
              type="submit"
            >
              {busy ? "Saving…" : "Save recipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StaffAccessScreen({
  roles,
  userId,
}: {
  roles: readonly AppRole[];
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("salesman");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const canAssignOwner = roles.includes("owner");
  const availableRoles: AppRole[] = canAssignOwner
    ? ["salesman", "admin", "production", "accountant", "owner"]
    : ["salesman", "admin", "production", "accountant"];
  const invitesQuery = useQuery({
    queryKey: ["staff-role-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_role_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("staff_role_invites").insert({
      email: cleanEmail,
      role,
      created_by: userId,
    });
    setBusy(false);
    if (error) {
      setFormError("That role access could not be added. Check for an existing invitation.");
      return;
    }
    setEmail("");
    setNotice("Role access is ready for that email address.");
    await queryClient.invalidateQueries({ queryKey: ["staff-role-invites"] });
  }

  const revokeInvite = useMutation({
    mutationFn: async (invite: InviteRow) => {
      const { error } = await supabase
        .from("staff_role_invites")
        .delete()
        .eq("id", invite.id)
        .is("claimed_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-role-invites"] }),
  });

  return (
    <>
      <ScreenHeader
        description="Role access is assigned to email addresses, not browser settings."
        eyebrow="Workspace access"
        title="Staff access"
      />
      <form
        className="grid gap-3 border-y border-border py-5 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end"
        onSubmit={createInvite}
      >
        <label className="block space-y-2 text-sm font-medium">
          Email address
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="staff@company.com"
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Role
          <Select onValueChange={(value) => setRole(value as AppRole)} value={role}>
            <SelectTrigger aria-label="Staff role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((option) => (
                <SelectItem key={option} value={option}>
                  {roleLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button disabled={busy} type="submit">
          <Plus aria-hidden="true" />
          Add role
        </Button>
      </form>
      {formError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-success" role="status">
          <Check aria-hidden="true" className="size-4" />
          {notice}
        </p>
      ) : null}

      <section className="mt-7">
        <h2 className="mb-3 text-base font-semibold">Assigned addresses</h2>
        {invitesQuery.isPending ? <LoadingState label="Loading staff access" /> : null}
        {invitesQuery.isError ? <ErrorState label="Staff access could not be loaded." /> : null}
        {invitesQuery.data ? (
          invitesQuery.data.length === 0 ? (
            <EmptyState title="No staff roles have been added yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Added</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitesQuery.data.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="max-w-64 break-all font-medium">{invite.email}</TableCell>
                    <TableCell>{roleLabels[invite.role]}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-sm px-2 py-1 text-xs ${invite.claimed_at ? "bg-success/10 text-success" : "bg-warning/25 text-warning-foreground"}`}
                      >
                        {invite.claimed_at ? "Account created" : "Awaiting account"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatShortDate(invite.created_at)}
                    </TableCell>
                    <TableCell>
                      {!invite.claimed_at ? (
                        <Button
                          aria-label={`Remove access for ${invite.email}`}
                          disabled={revokeInvite.isPending}
                          onClick={() => revokeInvite.mutate(invite)}
                          size="icon"
                          title="Remove pending access"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : null}
        {revokeInvite.isError ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            Pending access could not be removed.
          </p>
        ) : null}
      </section>
    </>
  );
}

function itemTypeLabel(type: string) {
  if (type === "raw") return "Raw material";
  if (type === "packaging") return "Packaging";
  if (type === "finished") return "Finished goods";
  return type;
}
