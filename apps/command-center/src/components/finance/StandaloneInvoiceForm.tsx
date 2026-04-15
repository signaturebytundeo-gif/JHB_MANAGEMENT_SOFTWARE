'use client';

import { useActionState, useEffect, useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Search,
  UserPlus,
  Send,
  Save,
  ArrowLeft,
  X,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createStandaloneInvoice,
  quickCreateCustomer,
  getCustomersForInvoice,
  getProductsForInvoice,
  type StandaloneInvoiceFormState,
  type QuickCustomerFormState,
  type InvoiceCustomer,
  type InvoiceProduct,
} from '@/app/actions/standalone-invoices';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  deliveryNote: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function StandaloneInvoiceForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [invoiceState, invoiceAction] = useActionState<StandaloneInvoiceFormState, FormData>(
    createStandaloneInvoice,
    undefined
  );

  // Customer
  const [customers, setCustomers] = useState<InvoiceCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<InvoiceCustomer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // New customer form
  const [newCustomerState, newCustomerAction] = useActionState<QuickCustomerFormState, FormData>(
    quickCreateCustomer,
    undefined
  );

  // Products
  const [products, setProducts] = useState<InvoiceProduct[]>([]);

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', productId: '', quantity: 1, unitPrice: 0, deliveryNote: '' },
  ]);

  // Other fields
  const [taxRate, setTaxRate] = useState(0);
  const [sendOnCreate, setSendOnCreate] = useState(false);

  // ── Load products on mount ─────────────────────────────────────────────────

  useEffect(() => {
    getProductsForInvoice().then(setProducts);
  }, []);

  // ── Customer search ────────────────────────────────────────────────────────

  const searchCustomers = useCallback(async (query: string) => {
    setLoadingCustomers(true);
    const results = await getCustomersForInvoice(query || undefined);
    setCustomers(results);
    setLoadingCustomers(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.length >= 0) {
        searchCustomers(customerSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  // ── Handle invoice creation result ─────────────────────────────────────────

  useEffect(() => {
    if (invoiceState?.success && invoiceState.invoiceId) {
      toast.success(sendOnCreate ? 'Invoice created and sent!' : 'Invoice created as draft');
      router.push(`/dashboard/finance/invoices/${invoiceState.invoiceId}`);
    } else if (invoiceState?.message && !invoiceState.success) {
      toast.error(invoiceState.message);
    }
  }, [invoiceState, router, sendOnCreate]);

  // ── Handle new customer result ─────────────────────────────────────────────

  useEffect(() => {
    if (newCustomerState?.success && newCustomerState.customerId) {
      toast.success('Customer created');
      setSelectedCustomerId(newCustomerState.customerId);
      setShowNewCustomerForm(false);
      // Reload customers to include the new one
      searchCustomers('').then(() => {
        // Find the customer in the list
        getCustomersForInvoice().then((custs) => {
          const found = custs.find((c) => c.id === newCustomerState.customerId);
          if (found) {
            setSelectedCustomer(found);
            setCustomerSearch(`${found.firstName} ${found.lastName}`);
          }
          setCustomers(custs);
        });
      });
    } else if (newCustomerState?.message && !newCustomerState.success) {
      toast.error(newCustomerState.message);
    }
  }, [newCustomerState, searchCustomers]);

  // ── Line item helpers ──────────────────────────────────────────────────────

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', productId: '', quantity: 1, unitPrice: 0, deliveryNote: '' },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // If product selected, auto-fill description
        if (field === 'productId' && value) {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.description = `${product.name} (${product.size})`;
          }
        }

        return updated;
      })
    );
  };

  // ── Calculations ───────────────────────────────────────────────────────────

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // ── Submit handler ─────────────────────────────────────────────────────────

  const handleSubmit = (send: boolean) => {
    setSendOnCreate(send);

    const formData = new FormData();
    formData.set('customerId', selectedCustomerId);
    formData.set('dueDate', (document.getElementById('dueDate') as HTMLInputElement)?.value || '');
    formData.set('taxRate', String(taxRate));
    formData.set('notes', (document.getElementById('notes') as HTMLTextAreaElement)?.value || '');
    formData.set('paymentLink', (document.getElementById('paymentLink') as HTMLInputElement)?.value || '');
    formData.set('sendEmail', send ? 'true' : 'false');

    const items = lineItems.map((item) => ({
      description: item.description,
      productId: item.productId || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      deliveryNote: item.deliveryNote || null,
    }));
    formData.set('lineItems', JSON.stringify(items));

    startTransition(() => {
      invoiceAction(formData);
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/dashboard/finance"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Finance
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
        <p className="text-muted-foreground mt-1">
          Create a standalone invoice with line items and send it directly to a customer.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Customer Section ────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Customer</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
              className="gap-1.5"
            >
              {showNewCustomerForm ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  New Customer
                </>
              )}
            </Button>
          </div>

          {/* Customer Search */}
          {!showNewCustomerForm && (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name, email, or company..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="pl-9 h-11"
                />
              </div>

              {showCustomerDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No customers found. Create one using the button above.
                    </div>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(customer.id);
                          setSelectedCustomer(customer);
                          setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
                          setShowCustomerDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted ${
                          selectedCustomerId === customer.id ? 'bg-caribbean-green/10' : ''
                        }`}
                      >
                        <div className="font-medium">
                          {customer.firstName} {customer.lastName}
                          {customer.company && (
                            <span className="text-muted-foreground font-normal"> — {customer.company}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected Customer Display */}
          {selectedCustomer && !showNewCustomerForm && (
            <div className="rounded-md bg-muted/40 border p-3 text-sm space-y-0.5">
              <p className="font-semibold">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </p>
              {selectedCustomer.company && (
                <p className="text-muted-foreground">{selectedCustomer.company}</p>
              )}
              <p className="text-muted-foreground">{selectedCustomer.email}</p>
              {selectedCustomer.phone && (
                <p className="text-muted-foreground">{selectedCustomer.phone}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId('');
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
                className="text-xs text-destructive hover:underline mt-1"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* New Customer Inline Form */}
          {showNewCustomerForm && (
            <form action={newCustomerAction} className="space-y-3 border rounded-md p-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nc-firstName">First Name *</Label>
                  <Input id="nc-firstName" name="firstName" required className="h-9 mt-1" />
                  {newCustomerState?.errors?.firstName && (
                    <p className="text-xs text-destructive mt-0.5">{newCustomerState.errors.firstName[0]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nc-lastName">Last Name *</Label>
                  <Input id="nc-lastName" name="lastName" required className="h-9 mt-1" />
                  {newCustomerState?.errors?.lastName && (
                    <p className="text-xs text-destructive mt-0.5">{newCustomerState.errors.lastName[0]}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nc-email">Email *</Label>
                  <Input id="nc-email" name="email" type="email" required className="h-9 mt-1" />
                  {newCustomerState?.errors?.email && (
                    <p className="text-xs text-destructive mt-0.5">{newCustomerState.errors.email[0]}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nc-phone">Phone</Label>
                  <Input id="nc-phone" name="phone" className="h-9 mt-1" />
                </div>
              </div>
              <div>
                <Label htmlFor="nc-company">Business / Company</Label>
                <Input id="nc-company" name="company" className="h-9 mt-1" />
              </div>
              <div>
                <Label htmlFor="nc-billingAddress">Address</Label>
                <Input id="nc-billingAddress" name="billingAddress" className="h-9 mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="nc-city">City</Label>
                  <Input id="nc-city" name="city" className="h-9 mt-1" />
                </div>
                <div>
                  <Label htmlFor="nc-state">State</Label>
                  <Input id="nc-state" name="state" className="h-9 mt-1" />
                </div>
                <div>
                  <Label htmlFor="nc-zip">Zip</Label>
                  <Input id="nc-zip" name="zip" className="h-9 mt-1" />
                </div>
              </div>
              <input type="hidden" name="customerType" value="WHOLESALE" />
              <Button type="submit" size="sm" className="bg-caribbean-green hover:bg-caribbean-green/90 text-white">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Create Customer
              </Button>
            </form>
          )}

          {invoiceState?.errors?.customerId && (
            <p className="text-xs text-destructive">{invoiceState.errors.customerId[0]}</p>
          )}
        </div>

        {/* ── Invoice Details ─────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                className="h-11 mt-1"
                defaultValue={
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                }
              />
              {invoiceState?.errors?.dueDate && (
                <p className="text-xs text-destructive mt-0.5">{invoiceState.errors.dueDate[0]}</p>
              )}
            </div>
            <div>
              <Label htmlFor="taxRateInput">Tax Rate (%)</Label>
              <Input
                id="taxRateInput"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="h-11 mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="paymentLink">Payment Link (optional Square URL)</Label>
            <Input
              id="paymentLink"
              name="paymentLink"
              type="url"
              placeholder="https://checkout.square.site/..."
              className="h-11 mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes / Terms (optional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Payment instructions, special terms..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none mt-1"
            />
          </div>
        </div>

        {/* ── Line Items ──────────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Line Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>

          {invoiceState?.errors?.lineItems && (
            <p className="text-xs text-destructive">{invoiceState.errors.lineItems[0]}</p>
          )}

          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Product</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-1">Delivery</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          {/* Line item rows */}
          {lineItems.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-4">
                <Input
                  placeholder="Description..."
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  className="h-9 text-sm"
                />
                {invoiceState?.errors?.[`lineItems.${idx}.description`] && (
                  <p className="text-xs text-destructive mt-0.5">
                    {invoiceState.errors[`lineItems.${idx}.description`][0]}
                  </p>
                )}
              </div>
              <div className="col-span-6 sm:col-span-2">
                <SearchableSelect
                  value={item.productId || undefined}
                  onValueChange={(value) => updateLineItem(item.id, 'productId', value)}
                  placeholder="None"
                  searchPlaceholder="Search catalog..."
                  emptyMessage="No products found"
                  options={products.map(p => ({
                    value: p.id,
                    label: `${p.name} (${p.size})`,
                    keywords: [p.size].filter(Boolean) as string[],
                  }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3 sm:col-span-1">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Input
                  placeholder="Delivery"
                  value={item.deliveryNote}
                  onChange={(e) => updateLineItem(item.id, 'deliveryNote', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-4 sm:col-span-1 flex items-center justify-end h-9">
                <span className="text-sm font-medium">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center justify-center h-9">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(item.id)}
                  disabled={lineItems.length <= 1}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span className="text-caribbean-green">
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {invoiceState?.message && !invoiceState.success && (
          <p className="text-sm text-destructive">{invoiceState.message}</p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isPending || !selectedCustomerId}
            variant="outline"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isPending && !sendOnCreate ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isPending || !selectedCustomerId}
            className="bg-caribbean-green hover:bg-caribbean-green/90 text-white gap-2"
          >
            <Send className="h-4 w-4" />
            {isPending && sendOnCreate ? 'Creating & Sending...' : 'Create & Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
