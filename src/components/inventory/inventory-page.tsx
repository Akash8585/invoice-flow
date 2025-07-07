"use client";

import { Plus, Warehouse, Search, Edit, Trash2, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Imports for optimized architecture
import { useInventoryStore } from '@/stores/inventory-store';
import { 
  useInventory, 
  useCreateInventory, 
  useUpdateInventory, 
  useDeleteInventory
} from '@/hooks/use-inventory';
import { useItems } from '@/hooks/use-items';
import { useSuppliers } from '@/hooks/use-suppliers';
import { InventoryForm, inventorySchema } from '@/lib/schemas';

export default function InventoryPage() {
  // Zustand store (UI state only)
  const {
    searchTerm,
    setSearchTerm,
    itemFilter,
    setItemFilter,
    supplierFilter,
    setSupplierFilter,
    isInventoryDialogOpen,
    setInventoryDialogOpen,
    editingInventory,
    setEditingInventory,
    getFilteredInventory,
    getTotalInventory,
    getTotalValue,
  } = useInventoryStore();

  // TanStack Query hooks
  const { data: inventory = [], isLoading: isLoadingInventory } = useInventory();
  const { data: items = [], isLoading: isLoadingItems } = useItems();
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useSuppliers();
  
  // Mutations
  const createInventoryMutation = useCreateInventory();
  const updateInventoryMutation = useUpdateInventory();
  const deleteInventoryMutation = useDeleteInventory();

  // Forms with Zod validation
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
  });

  // Watch form values for controlled components
  const watchedItemId = watch('itemId');
  const watchedSupplierId = watch('supplierId');

  // Get computed values from store using current data
  const currentFilteredInventory = getFilteredInventory(inventory);
  const currentTotalInventory = getTotalInventory(inventory);
  const currentTotalValue = getTotalValue(inventory);

  // Handle form submission
  const onSubmit = async (data: InventoryForm) => {
    if (editingInventory) {
      updateInventoryMutation.mutate(
        { id: editingInventory.id, inventory: data },
        {
          onSuccess: () => {
            setInventoryDialogOpen(false);
            setEditingInventory(null);
            reset();
          },
        }
      );
    } else {
      createInventoryMutation.mutate(data, {
        onSuccess: () => {
          setInventoryDialogOpen(false);
          reset();
        },
      });
    }
  };

  // Handle edit
  const handleEdit = (inv: any) => {
    setEditingInventory(inv);
    setValue('itemId', inv.itemId);
    setValue('supplierId', inv.supplierId || '');
    setValue('batchNumber', inv.batchNumber || '');
    setValue('quantity', parseFloat(inv.quantity));
    setValue('purchaseDate', inv.purchaseDate.split('T')[0]);
    setValue('expiryDate', inv.expiryDate ? inv.expiryDate.split('T')[0] : '');
    setValue('location', inv.location || '');
    setValue('notes', inv.notes || '');
    setInventoryDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    deleteInventoryMutation.mutate(id);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  const isLoading = isLoadingInventory || isLoadingItems || isLoadingSuppliers;

  if (isLoading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track stock levels, suppliers, and purchase information
          </p>
        </div>
        
        <Dialog open={isInventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingInventory(null);
                reset();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingInventory ? 'Edit Inventory' : 'Add New Stock'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemId">Item</Label>
                  <Select 
                    value={watchedItemId || undefined} 
                    onValueChange={(value) => setValue('itemId', value)}
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
                  {errors.itemId && (
                    <p className="text-sm text-red-500 mt-1">{errors.itemId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="supplierId">Supplier (Optional)</Label>
                  <Select 
                    value={watchedSupplierId ? watchedSupplierId : 'none'} 
                    onValueChange={(value) => setValue('supplierId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batchNumber">Batch Number (Optional)</Label>
                  <Input
                    id="batchNumber"
                    {...register('batchNumber')}
                    placeholder="Enter batch number"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    {...register('location')}
                    placeholder="Storage location"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  {...register('quantity', { 
                    required: 'Quantity is required',
                    min: { value: 0, message: 'Quantity must be positive' },
                    valueAsNumber: true
                  })}
                  placeholder="0"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    {...register('purchaseDate', { required: 'Purchase date is required' })}
                  />
                  {errors.purchaseDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.purchaseDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    {...register('expiryDate')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  {...register('notes')}
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createInventoryMutation.isPending || updateInventoryMutation.isPending}
                >
                  {createInventoryMutation.isPending || updateInventoryMutation.isPending 
                    ? 'Saving...' 
                    : editingInventory ? 'Update Stock' : 'Add Stock'
                  }
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setInventoryDialogOpen(false);
                    setEditingInventory(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTotalInventory}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentTotalValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(inventory.map(inv => inv.itemId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, SKU, or batch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={itemFilter} onValueChange={setItemFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            {currentFilteredInventory.length} of {currentTotalInventory} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentFilteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <Warehouse className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No inventory found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {inventory.length === 0 ? 'Get started by adding your first stock item.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Batch/Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentFilteredInventory.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{inv.item.name}</div>
                          <div className="text-sm text-muted-foreground">{inv.item.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {inv.supplier ? inv.supplier.name : 'No Supplier'}
                      </TableCell>
                      <TableCell>
                        <div>
                          {inv.batchNumber && <div className="text-sm">Batch: {inv.batchNumber}</div>}
                          {inv.location && <div className="text-sm text-muted-foreground">{inv.location}</div>}
                          {!inv.batchNumber && !inv.location && '-'}
                        </div>
                      </TableCell>
                      <TableCell>{parseFloat(inv.quantity).toFixed(2)} {inv.item.unit || 'pcs'}</TableCell>
                      <TableCell>{parseFloat(inv.availableQuantity).toFixed(2)} {inv.item.unit || 'pcs'}</TableCell>
                      <TableCell>{formatDate(inv.purchaseDate)}</TableCell>
                      <TableCell>
                        {inv.expiryDate ? formatDate(inv.expiryDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <Warehouse className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(inv)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(inv.id)}
                              className="text-red-600"
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