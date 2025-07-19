"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Package, Plus, Trash2, Truck, Calculator, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// Local schema that matches form expectations
const localPurchaseBillSchema = z.object({
  supplierId: z.string(),
  billNumber: z.string().min(1, 'Bill number is required'),
  billDate: z.string().min(1, 'Bill date is required'),
  items: z.array(z.object({
    itemId: z.string().min(1, 'Item is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    costPrice: z.number().min(0, 'Cost price must be positive'),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })).min(1, 'At least one item is required'),
  taxRate: z.number().min(0).max(100),
  extraCharges: z.array(z.object({
    name: z.string().min(1, 'Charge name is required'),
    amount: z.number().min(0, 'Amount must be positive'),
  })),
  notes: z.string().optional(),
  status: z.enum(['pending', 'received', 'cancelled']),
});

type LocalPurchaseBillForm = z.infer<typeof localPurchaseBillSchema>;

// Function to generate bill number
const generateBillNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PB-${year}${month}${day}-${random}`;
};

// Function to generate batch number from date
const generateBatchNumber = (date: string) => {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export default function CreatePurchaseBillPage() {
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<LocalPurchaseBillForm>({
    resolver: zodResolver(localPurchaseBillSchema),
    defaultValues: {
      supplierId: 'none',
      billNumber: generateBillNumber(),
      billDate: new Date().toISOString().split('T')[0],
      items: [{ 
        itemId: '', 
        quantity: 0, 
        costPrice: 0, 
        batchNumber: generateBatchNumber(new Date().toISOString().split('T')[0]), 
        expiryDate: '' 
      }],
      taxRate: 0,
      extraCharges: [],
      notes: '',
      status: 'pending'
    }
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items'
  });

  const { fields: extraChargeFields, append: appendExtraCharge, remove: removeExtraCharge } = useFieldArray({
    control,
    name: 'extraCharges'
  });

  // Watch form values for calculations
  const watchedItems = watch('items');
  const watchedTaxRate = watch('taxRate');
  const watchedExtraCharges = watch('extraCharges');
  const watchedBillDate = watch('billDate');

  // Update batch numbers when bill date changes
  useEffect(() => {
    if (watchedBillDate) {
      const batchNumber = generateBatchNumber(watchedBillDate);
      watchedItems.forEach((_, index) => {
        setValue(`items.${index}.batchNumber`, batchNumber);
      });
    }
  }, [watchedBillDate, setValue, watchedItems]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch items
        const itemsResponse = await fetch('/api/items');
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setItems(itemsData);
        }

        // Fetch suppliers
        const suppliersResponse = await fetch('/api/suppliers');
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate totals
  const calculateSubtotal = () => {
    return watchedItems.reduce((sum, item) => {
      return sum + (item.quantity * item.costPrice);
    }, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * watchedTaxRate) / 100;
  };

  const calculateExtraChargesTotal = () => {
    return watchedExtraCharges.reduce((sum, charge) => {
      return sum + charge.amount;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const extraChargesTotal = calculateExtraChargesTotal();
    return subtotal + tax + extraChargesTotal;
  };

  // Handle item selection to auto-fill cost price
  const handleItemSelect = (itemIndex: number, itemId: string) => {
    const selectedItem = items.find(item => item.id === itemId);
    if (selectedItem) {
      setValue(`items.${itemIndex}.costPrice`, parseFloat(selectedItem.costPrice));
    }
  };

  // Add new item row
  const addItemRow = () => {
    const batchNumber = watchedBillDate ? generateBatchNumber(watchedBillDate) : '';
    appendItem({
      itemId: '',
      quantity: 0,
      costPrice: 0,
      batchNumber: batchNumber,
      expiryDate: ''
    });
  };

  // Add new extra charge
  const addExtraCharge = () => {
    appendExtraCharge({
      name: '',
      amount: 0
    });
  };

  // Handle form submission
  const onSubmit = async (data: LocalPurchaseBillForm) => {
    setIsSubmitting(true);
    try {
      // Convert "none" supplier to empty string for API
      const submitData = {
        ...data,
        supplierId: data.supplierId === 'none' ? '' : data.supplierId
      };

      const response = await fetch('/api/purchase-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success('Purchase bill created successfully!');
        router.push('/inventory');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create purchase bill');
      }
    } catch (error) {
      console.error('Error creating purchase bill:', error);
      toast.error('Failed to create purchase bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Create Purchase Bill
            </h1>
            <p className="text-muted-foreground mt-1">
              Add new stock through purchase bills
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="supplierId">Supplier</Label>
                <Select 
                  value={watch('supplierId')} 
                  onValueChange={(value) => setValue('supplierId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Supplier</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="billNumber">Bill Number (Auto-generated)</Label>
                <Input
                  id="billNumber"
                  {...register('billNumber')}
                  placeholder="Enter bill number"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated but can be edited
                </p>
                {errors.billNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.billNumber.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="billDate">Bill Date</Label>
                <Input
                  id="billDate"
                  type="date"
                  {...register('billDate')}
                />
                {errors.billDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.billDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  {...register('taxRate', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {itemFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <Label>Item</Label>
                      <Select 
                        value={watch(`items.${index}.itemId`)} 
                        onValueChange={(value) => {
                          setValue(`items.${index}.itemId`, value);
                          handleItemSelect(index, value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.items?.[index]?.itemId && (
                        <p className="text-sm text-red-500 mt-1">{errors.items[index]?.itemId?.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="0"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-red-500 mt-1">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Cost Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.costPrice`, { valueAsNumber: true })}
                        placeholder="0.00"
                      />
                      {errors.items?.[index]?.costPrice && (
                        <p className="text-sm text-red-500 mt-1">{errors.items[index]?.costPrice?.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Batch Number (Auto-generated)</Label>
                      <Input
                        {...register(`items.${index}.batchNumber`)}
                        placeholder="Auto-generated from bill date"
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Generated from bill date: {watchedBillDate ? generateBatchNumber(watchedBillDate) : ''}
                      </p>
                    </div>

                    <div>
                      <Label>Expiry Date</Label>
                      <Input
                        type="date"
                        {...register(`items.${index}.expiryDate`)}
                      />
                    </div>
                  </div>

                  {itemFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="mt-2"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Item
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addItemRow}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Extra Charges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Extra Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {extraChargeFields.map((field, index) => (
                <div key={field.id} className="flex gap-4">
                  <div className="flex-1">
                    <Label>Charge Name</Label>
                    <Input
                      {...register(`extraCharges.${index}.name`)}
                      placeholder="e.g., Shipping, Handling"
                    />
                  </div>
                  <div className="w-32">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`extraCharges.${index}.amount`, { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeExtraCharge(index)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addExtraCharge}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Extra Charge
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({watchedTaxRate}%):</span>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra Charges:</span>
                <span>${calculateExtraChargesTotal().toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Purchase Bill'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
} 