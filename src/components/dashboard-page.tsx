"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Package, 
  AlertTriangle,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Truck,
  Receipt
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalExpenses: number;
  expensesChange: number;
  netProfit: number;
  profitChange: number;
  stockItems: number;
  stockChange: number;
  totalClients: number;
  pendingInvoices: number;
  overdueInvoices: number;
  lowStockItems: number;
}

interface RecentTransaction {
  id: string;
  type: 'invoice' | 'expense';
  description: string;
  amount: number;
  date: string;
  status: string;
}
    
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueChange: 0,
    totalExpenses: 0,
    expensesChange: 0,
    netProfit: 0,
    profitChange: 0,
    stockItems: 0,
    stockChange: 0,
    totalClients: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    lowStockItems: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentTransactions(data.recentTransactions);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Keep default empty state - no sample data
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatChange = (change: number) => {
    // Don't show percentage if change is 0 and there's no base data
    if (change === 0) {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <span className="text-sm font-medium">No change</span>
        </div>
      );
    }
    
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{Math.abs(change)}%</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              InvoiceFlow Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your invoices, expenses, and inventory
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/invoices/new">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </Link>
            <Link href="/clients/new">
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              {formatChange(stats.revenueChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
              {formatChange(stats.expensesChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.netProfit)}</div>
              {formatChange(stats.profitChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.stockItems}</div>
              {formatChange(stats.stockChange)}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Total Clients</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalClients}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Pending Invoices</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{stats.pendingInvoices}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Overdue Invoices</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.overdueInvoices}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Low Stock Items</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-300">{stats.lowStockItems}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
            <CardDescription>
              Your latest transactions and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your recent transactions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'invoice' 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        {transaction.type === 'invoice' ? (
                          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                          {transaction.description}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className={`font-bold text-sm sm:text-base ${
                        transaction.type === 'invoice' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'invoice' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                      <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription>
              Frequently used actions to manage your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/invoices/new">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Create Invoice</span>
                </Button>
              </Link>
              
              <Link href="/clients">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">Manage Clients</span>
                </Button>
              </Link>
              
              <Link href="/inventory">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Package className="h-6 w-6" />
                  <span className="text-sm font-medium">Check Inventory</span>
                </Button>
              </Link>
              
              <Link href="/reports">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm font-medium">View Reports</span>
                </Button>
              </Link>
              
              <Link href="/suppliers">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Truck className="h-6 w-6" />
                  <span className="text-sm font-medium">Manage Suppliers</span>
                </Button>
              </Link>
              
              <Link href="/billing">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  <span className="text-sm font-medium">Create Bills</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}