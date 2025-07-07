import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/db';
import { bills, billItems, billExtraCharges, inventory, clients } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { extendedBillSchema } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get bills with client information and items
    const billsList = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        invoiceNumber: bills.invoiceNumber,
        billDate: bills.billDate,
        subtotal: bills.subtotal,
        taxRate: bills.taxRate,
        tax: bills.tax,
        extraChargesTotal: bills.extraChargesTotal,
        total: bills.total,
        status: bills.status,
        notes: bills.notes,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt,
        client: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
        }
      })
      .from(bills)
      .leftJoin(clients, eq(bills.clientId, clients.id))
      .where(eq(bills.userId, userId))
      .orderBy(desc(bills.createdAt));

    return NextResponse.json(billsList);

  } catch (error) {
    console.error('Bills API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate the request body
    const validatedData = extendedBillSchema.parse(body);
    const { clientId, invoiceNumber, billDate, items, taxRate, extraCharges, notes, status } = validatedData;

    // Calculate totals
    let subtotal = 0;
    const itemsData = [];

    // Validate inventory availability and calculate subtotal
    for (const item of items) {
      const inventoryItem = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, item.inventoryId))
        .limit(1);

      if (inventoryItem.length === 0) {
        return NextResponse.json(
          { error: `Inventory item ${item.inventoryId} not found` },
          { status: 400 }
        );
      }

      const availableQty = parseFloat(inventoryItem[0].availableQuantity);
      if (availableQty < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${availableQty}, Requested: ${item.quantity}` },
          { status: 400 }
        );
      }

      const itemTotal = item.quantity * item.sellingPrice;
      subtotal += itemTotal;

      itemsData.push({
        inventoryId: item.inventoryId,
        quantity: item.quantity.toString(),
        sellingPrice: item.sellingPrice.toString(),
        total: itemTotal.toString(),
        inventoryItem: inventoryItem[0]
      });
    }

    // Calculate extra charges total
    const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);

    // Calculate tax and grand total
    const tax = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + tax + extraChargesTotal;

    // Generate bill number if not provided
    const billNumber = invoiceNumber; // Use invoice number as bill number for now

    // Create the bill
    const [newBill] = await db.insert(bills).values({
      userId,
      clientId,
      billNumber,
      invoiceNumber,
      billDate: new Date(billDate),
      subtotal: subtotal.toString(),
      taxRate: taxRate.toString(),
      tax: tax.toString(),
      extraChargesTotal: extraChargesTotal.toString(),
      total: grandTotal.toString(),
      status: status || 'due',
      notes: notes || null,
    }).returning();

    // Create bill items
    const billItemsToInsert = itemsData.map(item => ({
      billId: newBill.id,
      inventoryId: item.inventoryId,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      total: item.total,
    }));

    await db.insert(billItems).values(billItemsToInsert);

    // Create extra charges if any
    if (extraCharges.length > 0) {
      const extraChargesToInsert = extraCharges.map(charge => ({
        billId: newBill.id,
        name: charge.name,
        amount: charge.amount.toString(),
      }));

      await db.insert(billExtraCharges).values(extraChargesToInsert);
    }

    // Update inventory quantities (reduce available quantity)
    for (const item of itemsData) {
      const newAvailableQuantity = parseFloat(item.inventoryItem.availableQuantity) - parseFloat(item.quantity);
      
      await db
        .update(inventory)
        .set({ 
          availableQuantity: newAvailableQuantity.toString(),
          updatedAt: new Date()
        })
        .where(eq(inventory.id, item.inventoryId));
    }

    return NextResponse.json({
      ...newBill,
      message: 'Bill created successfully and inventory updated'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create bill error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    );
  }
} 