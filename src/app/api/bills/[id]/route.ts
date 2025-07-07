import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/db';
import { bills, billItems, billExtraCharges, inventory, clients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const billId = params.id;

    // Get bill with client information
    const billHeader = await db
      .select({
        id:            bills.id,
        billNumber:    bills.billNumber,
        invoiceNumber: bills.invoiceNumber,
        billDate:      bills.billDate,
        subtotal:      bills.subtotal,
        taxRate:       bills.taxRate,
        tax:           bills.tax,
        extraChargesTotal: bills.extraChargesTotal,
        total:         bills.total,
        status:        bills.status,
        notes:         bills.notes,
        createdAt:     bills.createdAt,
        updatedAt:     bills.updatedAt,
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
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .limit(1);

    if (billHeader.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const bill = billHeader[0];

    // Get bill items
    const billItemsResult = await db
      .select({
        id:           billItems.id,
        inventoryId:  billItems.inventoryId,
        quantity:     billItems.quantity,
        sellingPrice: billItems.sellingPrice,
        total:        billItems.total,
      })
      .from(billItems)
      .where(eq(billItems.billId, billId));

    // Get extra charges
    const extraChargesResult = await db
      .select()
      .from(billExtraCharges)
      .where(eq(billExtraCharges.billId, billId));

    // Combine all data
    const fullBill = {
      ...bill,
      items: billItemsResult,
      extraCharges: extraChargesResult
    };

    return NextResponse.json(fullBill);

  } catch (error) {
    console.error('Get bill API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const billId = params.id;
    const body = await request.json();

    // Map only allowed fields and convert types where necessary
    const updateData: any = { updatedAt: new Date() };

    if (body.clientId) updateData.clientId = body.clientId;
    if (body.billDate) updateData.billDate = new Date(body.billDate);
    if (body.invoiceNumber) updateData.invoiceNumber = body.invoiceNumber;
    if (body.status) updateData.status = body.status;
    if (body.taxRate !== undefined) updateData.taxRate = body.taxRate.toString();
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Check if bill exists and belongs to user
    const existingBill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .limit(1);

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Update bill
    const [updatedBill] = await db
      .update(bills)
      .set(updateData)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .returning();

    return NextResponse.json(updatedBill);

  } catch (error) {
    console.error('Update bill API error:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const billId = params.id;
    const body = await request.json();

    // Check if bill exists and belongs to user
    const existingBill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .limit(1);

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Update only the provided fields (partial update)
    const [updatedBill] = await db
      .update(bills)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .returning();

    return NextResponse.json(updatedBill);

  } catch (error) {
    console.error('Patch bill API error:', error);
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const billId = params.id;

    // Check if bill exists and belongs to user
    const existingBill = await db
      .select()
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .limit(1);

    if (existingBill.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Get bill items to restore inventory
    const billItemsList = await db
      .select()
      .from(billItems)
      .where(eq(billItems.billId, billId));

    // Restore inventory quantities
    for (const item of billItemsList) {
      const currentInventory = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, item.inventoryId))
        .limit(1);

      if (currentInventory.length > 0) {
        const newAvailableQuantity = parseFloat(currentInventory[0].availableQuantity) + parseFloat(item.quantity);
        
        await db
          .update(inventory)
          .set({ 
            availableQuantity: newAvailableQuantity.toString(),
            updatedAt: new Date()
          })
          .where(eq(inventory.id, item.inventoryId));
      }
    }

    // Delete bill items and extra charges first (foreign key constraints)
    await db.delete(billItems).where(eq(billItems.billId, billId));
    await db.delete(billExtraCharges).where(eq(billExtraCharges.billId, billId));

    // Delete the bill
    await db
      .delete(bills)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)));

    return NextResponse.json({ 
      message: 'Bill deleted successfully and inventory restored' 
    });

  } catch (error) {
    console.error('Delete bill API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    );
  }
} 