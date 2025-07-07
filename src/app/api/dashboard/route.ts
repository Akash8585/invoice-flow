import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { db } from '@/db';
import { invoices, bills, clients, products, invoiceItems } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
    const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, currentDate.getDate());

    // Fetch dashboard statistics
    const [
      totalRevenueResult,
      totalExpensesResult,
      lastMonthRevenueResult,
      lastMonthExpensesResult,
      totalClientsResult,
      lastMonthClientsResult,
      totalProductsResult,
      invoiceStatusResult,
      lowStockResult,
      recentInvoicesResult,
      recentBillsResult
    ] = await Promise.all([
      // Total Revenue (sum of paid invoices)
      db.select({
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.status, 'paid'))),

      // Total Expenses (sum of paid bills)
      db.select({
        total: sql<number>`COALESCE(SUM(${bills.amount}), 0)`,
        count: sql<number>`COUNT(*)`
      })
      .from(bills)
      .where(and(eq(bills.userId, userId), eq(bills.status, 'paid'))),

      // Last Month Revenue
      db.select({
        total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)`
      })
      .from(invoices)
      .where(and(
        eq(invoices.userId, userId), 
        eq(invoices.status, 'paid'),
        gte(invoices.issueDate, twoMonthsAgo),
        sql`${invoices.issueDate} < ${lastMonth}`
      )),

      // Last Month Expenses
      db.select({
        total: sql<number>`COALESCE(SUM(${bills.amount}), 0)`
      })
      .from(bills)
      .where(and(
        eq(bills.userId, userId), 
        eq(bills.status, 'paid'),
        gte(bills.createdAt, twoMonthsAgo),
        sql`${bills.createdAt} < ${lastMonth}`
      )),

      // Total Clients
      db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(clients)
      .where(eq(clients.userId, userId)),

      // Last Month Clients Count
      db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(clients)
      .where(and(
        eq(clients.userId, userId),
        sql`${clients.createdAt} < ${lastMonth}`
      )),

      // Total Products
      db.select({
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${products.price} * ${products.quantity}), 0)`
      })
      .from(products)
      .where(eq(products.userId, userId)),

      // Invoice Status Counts
      db.select({
        status: invoices.status,
        count: sql<number>`COUNT(*)`
      })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .groupBy(invoices.status),

      // Low Stock Items
      db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(products)
      .where(and(
        eq(products.userId, userId),
        sql`${products.quantity} <= ${products.minStock}`
      )),

      // Recent Invoices
      db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
        issueDate: invoices.issueDate,
        clientName: clients.name
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .limit(5),

      // Recent Bills
      db.select({
        id: bills.id,
        vendor: bills.vendor,
        description: bills.description,
        amount: bills.amount,
        status: bills.status,
        createdAt: bills.createdAt
      })
      .from(bills)
      .where(eq(bills.userId, userId))
      .orderBy(desc(bills.createdAt))
      .limit(3)
    ]);

    // Calculate stats
    const totalRevenue = Number(totalRevenueResult[0]?.total || 0);
    const totalExpenses = Number(totalExpensesResult[0]?.total || 0);
    const lastMonthRevenue = Number(lastMonthRevenueResult[0]?.total || 0);
    const lastMonthExpenses = Number(lastMonthExpensesResult[0]?.total || 0);
    const netProfit = totalRevenue - totalExpenses;
    const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;
    const totalClients = Number(totalClientsResult[0]?.count || 0);
    const lastMonthClients = Number(lastMonthClientsResult[0]?.count || 0);
    const stockItems = Number(totalProductsResult[0]?.count || 0);
    const stockValue = Number(totalProductsResult[0]?.totalValue || 0);
    const lowStockItems = Number(lowStockResult[0]?.count || 0);

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number(((current - previous) / previous * 100).toFixed(1));
    };

    const revenueChange = calculatePercentageChange(totalRevenue, lastMonthRevenue);
    const expensesChange = calculatePercentageChange(totalExpenses, lastMonthExpenses);
    const profitChange = calculatePercentageChange(netProfit, lastMonthProfit);
    const clientsChange = calculatePercentageChange(totalClients, lastMonthClients);

    // Process invoice status counts
    const statusCounts = invoiceStatusResult.reduce((acc, item) => {
      acc[item.status] = Number(item.count);
      return acc;
    }, {} as Record<string, number>);

    const pendingInvoices = statusCounts.pending || 0;
    const overdueInvoices = statusCounts.overdue || 0;

    // Combine recent transactions
    const recentTransactions = [
      ...recentInvoicesResult.map(invoice => ({
        id: invoice.id,
        type: 'invoice' as const,
        description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName || 'Unknown Client'}`,
        amount: Number(invoice.totalAmount),
        date: invoice.issueDate.toISOString().split('T')[0],
        status: invoice.status
      })),
      ...recentBillsResult.map(bill => ({
        id: bill.id,
        type: 'expense' as const,
        description: `${bill.description} - ${bill.vendor}`,
        amount: Number(bill.amount),
        date: bill.createdAt.toISOString().split('T')[0],
        status: bill.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    // Real percentage changes based on historical data
    const stats = {
      totalRevenue,
      revenueChange,
      totalExpenses,
      expensesChange,
      netProfit,
      profitChange,
      stockItems,
      stockChange: clientsChange, // Using clients change as a proxy for stock change
      totalClients,
      pendingInvoices,
      overdueInvoices,
      lowStockItems,
    };

    return NextResponse.json({
      stats,
      recentTransactions
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
} 