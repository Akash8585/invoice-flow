"use client";

import { useState } from 'react';
import { Plus, Receipt, Edit, Trash2, FileText, Send, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React from 'react'; // Added missing import

// Import hooks
import { useInventory } from '@/hooks/use-inventory';
import { useClients } from '@/hooks/use-clients';
import { useBills, useCreateBill, useDeleteBill, useUpdateBill, useUpdateBillStatus, useBillDetails } from '@/hooks/use-bills';

// Form schema
const billingFormSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  billDate: z.string().min(1, 'Bill date is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  items: z.array(z.object({
    inventoryId: z.string().min(1, 'Item is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    sellingPrice: z.number().min(0, 'Price must be 0 or greater')
  })).min(1, 'At least one item is required'),
  taxRate: z.number().min(0).max(100).optional(),
  extraCharges: z.array(z.object({
    name: z.string().min(1, 'Charge name is required'),
    amount: z.number().min(0, 'Amount must be 0 or greater')
  })).optional(),
  notes: z.string().optional(),
  status: z.enum(['due', 'paid']),
  dueDate: z.string().min(1, 'Due date is required')
});

export type BillingFormData = z.infer<typeof billingFormSchema>;

// Generate invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}${day}-${random}`;
};

export default function BillingPage() {
  const [isBillDialogOpen, setBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any>(null);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // TanStack Query hooks
  const { data: inventory = [], isLoading: isLoadingInventory } = useInventory();
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const { data: bills = [], isLoading: isLoadingBills, refetch: refetchBills } = useBills();
  const { data: billDetails, isLoading: isLoadingBillDetails } = useBillDetails(editingBillId || '');
  const createBillMutation = useCreateBill();
  const deleteBillMutation = useDeleteBill();
  const updateBillStatusMutation = useUpdateBillStatus();
  const updateBillMutation = useUpdateBill();

  // Form with validation
  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<BillingFormData>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      invoiceNumber: generateInvoiceNumber(),
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ inventoryId: '', quantity: 1, sellingPrice: 0 }],
      taxRate: 10,
      extraCharges: [],
      status: 'due',
      clientId: ''
    }
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items'
  });

  const { fields: chargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({
    control,
    name: 'extraCharges'
  });

  // Watch form values
  const watchedItems = watch('items') || [];
  const watchedCharges = watch('extraCharges') || [];
  const watchedTaxRate = watch('taxRate') || 0;
  const watchedClientId = watch('clientId');

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => {
    return sum + ((item?.quantity || 0) * (item?.sellingPrice || 0));
  }, 0);
  
  const extraChargesTotal = watchedCharges.reduce((sum, charge) => {
    return sum + (charge?.amount || 0);
  }, 0);
  
  // Use watchedTaxRate to ensure tax updates when rate changes
  const tax = (subtotal * watchedTaxRate) / 100;
  const grandTotal = subtotal + tax + extraChargesTotal;

  // Handle form submission with stock update
  const onSubmit: SubmitHandler<BillingFormData> = async (data) => {
    try {
      console.log('Form data being submitted:', data);
      
      // Ensure all required fields are present and properly formatted
      const formattedData = {
        ...data,
        taxRate: data.taxRate || 0,
        extraCharges: data.extraCharges || [],
        items: data.items.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          sellingPrice: Number(item.sellingPrice)
        }))
      };
      
      console.log('Formatted data:', formattedData);
      
      if (editingBill) {
        // strip properties that aren’t real bill columns
        // (they’re stored in separate tables, the current endpoint doesn’t update them)
        const { items, extraCharges, ...billOnly } = formattedData;

        await updateBillMutation.mutateAsync({ id: editingBill.id, ...billOnly });
        alert('Bill updated successfully!');
      } else {
        const result = await createBillMutation.mutateAsync(formattedData);
        console.log('Bill creation result:', result);
        alert('Bill created successfully and inventory updated!');
      }
      
      setBillDialogOpen(false);
      reset({
        invoiceNumber: generateInvoiceNumber(),
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ inventoryId: '', quantity: 1, sellingPrice: 0 }],
        taxRate: 10,
        extraCharges: [],
        status: 'due',
        clientId: ''
      });
      setEditingBill(null);
    } catch (error) {
      console.error('Error saving bill:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Error saving bill: ${errorMessage}`);
    }
  };

  // Handle inventory item selection
  const handleInventorySelect = (index: number, inventoryId: string) => {
    const selectedItem = inventory.find(inv => inv.id === inventoryId);
    if (selectedItem) {
      setValue(`items.${index}.sellingPrice`, parseFloat(selectedItem.item.sellingPrice));
    }
  };

  // Get available inventory items (only those with stock)
  const availableInventory = inventory.filter(inv => parseFloat(inv.availableQuantity) > 0);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'due':
        return <Badge variant="default">Due</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Handle bill deletion
  const handleDeleteBill = async (billId: string) => {
    if (confirm('Are you sure you want to delete this bill? This will restore the inventory quantities.')) {
      try {
        await deleteBillMutation.mutateAsync(billId);
        alert('Bill deleted successfully and inventory restored!');
      } catch (error) {
        console.error('Error deleting bill:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete bill';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  // Handle bill status update
  const handleStatusUpdate = async (billId: string, newStatus: string) => {
    try {
      await updateBillStatusMutation.mutateAsync({ id: billId, status: newStatus });
      alert(`Bill status updated to ${newStatus}!`);
    } catch (error) {
      console.error('Error updating bill status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Handle opening the edit dialog
  const handleEditBill = (bill: any) => {
    setEditingBill(bill);
    setEditingBillId(bill.id);
    
    // Find the client and set form values
    reset({
      clientId: bill.client.id,
      billDate: new Date(bill.billDate).toISOString().split('T')[0],
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : 
               new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceNumber: bill.invoiceNumber,
      taxRate: parseFloat(bill.taxRate),
      notes: bill.notes || '',
      status: bill.status,
      items: Array.isArray(bill.items) ? bill.items.map((item: any) => ({
        inventoryId: item.inventoryId,
        quantity: parseFloat(item.quantity),
        sellingPrice: parseFloat(item.sellingPrice)
      })) : [{ inventoryId: '', quantity: 1, sellingPrice: 0 }],
      extraCharges: Array.isArray(bill.extraCharges) ? bill.extraCharges.map((charge: any) => ({
        name: charge.name,
        amount: parseFloat(charge.amount)
      })) : []
    });
    
    setBillDialogOpen(true);
  };

  // Effect to update form when bill details are loaded
  React.useEffect(() => {
    if (billDetails && editingBillId) {
      reset({
        clientId: billDetails.client.id,
        billDate: new Date(billDetails.billDate).toISOString().split('T')[0],
        dueDate: billDetails.dueDate ? new Date(billDetails.dueDate).toISOString().split('T')[0] : 
                 new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceNumber: billDetails.invoiceNumber,
        taxRate: parseFloat(billDetails.taxRate),
        notes: billDetails.notes || '',
        status: billDetails.status,
        items: Array.isArray(billDetails.items) ? billDetails.items.map((item: any) => ({
          inventoryId: item.inventoryId,
          quantity: parseFloat(item.quantity),
          sellingPrice: parseFloat(item.sellingPrice)
        })) : [{ inventoryId: '', quantity: 1, sellingPrice: 0 }],
        extraCharges: Array.isArray(billDetails.extraCharges) ? billDetails.extraCharges.map((charge: any) => ({
          name: charge.name,
          amount: parseFloat(charge.amount)
        })) : []
      });
    }
  }, [billDetails, editingBillId, reset]);

  // Effect to refetch bills when dialogs close
  React.useEffect(() => {
    if (!isBillDialogOpen && !isViewDialogOpen) {
      // Refetch bills to update the UI with the latest data
      refetchBills();
    }
  }, [isBillDialogOpen, isViewDialogOpen, refetchBills]);

  // Reset editing state when dialog closes
  const handleDialogChange = (open: boolean) => {
    setBillDialogOpen(open);
    if (!open) {
      setEditingBill(null);
      setEditingBillId(null);
    }
  };

  // Handle viewing bill details
  const handleViewBill = (bill: any) => {
    setViewingBill(bill);
    setIsViewDialogOpen(true);
  };

  // Loading state
  const isLoading = isLoadingInventory || isLoadingClients || isLoadingBills;

  if (isLoading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Billing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create bills from inventory and generate invoices
          </p>
        </div>
        
        <Dialog open={isBillDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingBill(null);
                reset({
                  invoiceNumber: generateInvoiceNumber(),
                  billDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  items: [{ inventoryId: '', quantity: 1, sellingPrice: 0 }],
                  taxRate: 10,
                  extraCharges: [],
                  status: 'due',
                  clientId: ''
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Bill
            </Button>
          </DialogTrigger>
          
          {/* Clean Minimal Dialog like First Image */}
          <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">

            <DialogHeader className="pb-4">
              <DialogTitle className="text-2xl font-semibold">
                {editingBill ? 'Edit Invoice' : 'New Invoice'}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Create professional invoices from your inventory items
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSubmit((data) => {
                onSubmit(data as unknown as BillingFormData);
              })(e);
            }} className="space-y-6 px-2 sm:px-4">
              {/* Invoice Details - Simple Grid */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Invoice Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Client</Label>
                    <Select 
                      value={watchedClientId || ''} 
                      onValueChange={(value) => setValue('clientId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.clientId && (
                      <p className="text-xs text-red-500">{errors.clientId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Invoice Date</Label>
                    <Input
                      type="date"
                      {...register('billDate')}
                    />
                    {errors.billDate && (
                      <p className="text-xs text-red-500">{errors.billDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Invoice Number</Label>
                    <Input
                      {...register('invoiceNumber')}
                      placeholder="INV-YYYYMMDD-XXX"
                    />
                    {errors.invoiceNumber && (
                      <p className="text-xs text-red-500">{errors.invoiceNumber.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Due Date</Label>
                    <Input
                      type="date"
                      {...register('dueDate')}
                    />
                    {errors.dueDate && (
                      <p className="text-xs text-red-500">{errors.dueDate.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select 
                      defaultValue="due"
                      value={watch('status')}
                      onValueChange={(value: 'due' | 'paid') => setValue('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due">Due</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-xs text-red-500">{errors.status.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Items - Simple List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Items</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => appendItem({ inventoryId: '', quantity: 1, sellingPrice: 0 })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {itemFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Select 
                          value={watchedItems[index]?.inventoryId || ''} 
                          onValueChange={(value) => {
                            setValue(`items.${index}.inventoryId`, value);
                            handleInventorySelect(index, value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableInventory.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                <div>
                                  <div className="font-medium">{inv.item.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Available: {parseFloat(inv.availableQuantity).toFixed(2)} {inv.item.unit || 'pcs'}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-3 lg:gap-2">
                        <div className="w-20">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className="text-center"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            placeholder="1"
                          />
                        </div>

                        <div className="w-24">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pl-6"
                              {...register(`items.${index}.sellingPrice`, { valueAsNumber: true })}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="w-20 text-right font-medium">
                          ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.sellingPrice || 0)).toFixed(2)}
                        </div>

                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={itemFields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Charges - Simple */}
              {chargeFields.length > 0 && (
                <div className="space-y-3">
                  {chargeFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Input
                          {...register(`extraCharges.${index}.name`)}
                          placeholder="Description (e.g., Delivery, Processing Fee)"
                        />
                      </div>

                      <div className="w-32">
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-6"
                            {...register(`extraCharges.${index}.amount`, { valueAsNumber: true })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeCharge(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                type="button" 
                variant="outline" 
                className="w-full border-dashed"
                onClick={() => appendCharge({ name: '', amount: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Extra Charge
              </Button>

              {/* Notes and Summary - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    rows={4}
                    {...register('notes')}
                    placeholder="Add any additional notes or terms..."
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Summary</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    
                    {extraChargesTotal > 0 && (
                      <div className="flex justify-between">
                        <span>Extra Charges</span>
                        <span>${extraChargesTotal.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>Tax</span>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="w-16 h-8 text-xs text-center"
                          {...register('taxRate', { 
                            valueAsNumber: true,
                            onChange: (e) => {
                              const value = parseFloat(e.target.value);
                              setValue('taxRate', isNaN(value) ? 0 : value);
                            }
                          })}
                        />
                        <span>%</span>
                      </div>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setBillDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBill ? 'Update Invoice' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* View Bill Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl w-full">
            {viewingBill && (
              <>
                <DialogHeader>
                  <div className="flex justify-between items-center">
                    <DialogTitle className="text-2xl font-semibold">
                      Invoice #{viewingBill.invoiceNumber}
                    </DialogTitle>
                    <div className="flex items-center">
                      <span className="mr-2 text-sm">Status:</span>
                      {getStatusBadge(viewingBill.status)}
                    </div>
                  </div>
                  <DialogDescription className="text-gray-500 flex justify-between items-center">
                    <span>Created on {new Date(viewingBill.createdAt).toLocaleDateString()}</span>
                    <span className="text-sm">
                      Last updated: {new Date(viewingBill.updatedAt).toLocaleDateString()}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-4 border-b pb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Bill To:</h3>
                      <div className="space-y-1">
                        <p className="font-medium text-base">{viewingBill.client.name}</p>
                        {viewingBill.client.email && <p className="text-sm">{viewingBill.client.email}</p>}
                        {viewingBill.client.phone && <p className="text-sm">{viewingBill.client.phone}</p>}
                        {viewingBill.client.address && <p className="text-sm">{viewingBill.client.address}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="space-y-2">
                        <div className="flex justify-end gap-3">
                          <span className="text-gray-500 text-sm">Invoice Date:</span>
                          <span className="font-medium">{new Date(viewingBill.billDate).toLocaleDateString()}</span>
                        </div>
                        {viewingBill.dueDate && (
                          <div className="flex justify-end gap-3">
                            <span className="text-gray-500 text-sm">Due Date:</span>
                            <span className="font-medium">{new Date(viewingBill.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                          <span className="text-gray-500 text-sm">Total:</span>
                          <span className="font-bold text-lg">${parseFloat(viewingBill.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items Table */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Items</h3>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(viewingBill.items) && viewingBill.items.length > 0 ? (
                            viewingBill.items.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.inventory?.item?.name || 'Unknown Item'}</TableCell>
                                <TableCell className="text-right">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                                <TableCell className="text-right">${parseFloat(item.sellingPrice).toFixed(2)}</TableCell>
                                <TableCell className="text-right">${parseFloat(item.total).toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                                No items found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal:</span>
                        <span>${parseFloat(viewingBill.subtotal).toFixed(2)}</span>
                      </div>
                      {parseFloat(viewingBill.extraChargesTotal) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Extra Charges:</span>
                          <span>${parseFloat(viewingBill.extraChargesTotal).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tax ({parseFloat(viewingBill.taxRate)}%):</span>
                        <span>${parseFloat(viewingBill.tax).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>${parseFloat(viewingBill.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {viewingBill.notes && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Notes</h3>
                      <p className="text-gray-600 text-sm">{viewingBill.notes}</p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsViewDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleEditBill(viewingBill);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button>
                          {viewingBill.status === 'due' ? 'Mark as Paid' : 'Update Status'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          handleStatusUpdate(viewingBill.id, 'due');
                          setViewingBill({...viewingBill, status: 'due'});
                        }}>
                          Mark as Due
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          handleStatusUpdate(viewingBill.id, 'paid');
                          setViewingBill({...viewingBill, status: 'paid'});
                        }}>
                          Mark as Paid
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bills.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Items</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableInventory.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bills.filter(bill => bill.status === 'due').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bills.reduce((sum, bill) => sum + parseFloat(bill.total), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
          <CardDescription>
            Manage your bills and generate invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No bills found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first bill.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow 
                      key={bill.id} 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleViewBill(bill)}
                    >
                      <TableCell className="font-medium">{bill.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{bill.client.name}</div>
                          <div className="text-sm text-muted-foreground">{bill.client.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>${parseFloat(bill.total).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(bill.status)}</TableCell>
                      <TableCell>{new Date(bill.billDate).toLocaleDateString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <Receipt className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditBill(bill)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(bill.id, bill.status === 'paid' ? 'due' : 'paid')}>
                              <Send className="mr-2 h-4 w-4" />
                              Mark as {bill.status === 'paid' ? 'Due' : 'Paid'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteBill(bill.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 