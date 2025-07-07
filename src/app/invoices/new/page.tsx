import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import InvoiceForm from "@/components/invoices/invoice-form";

export default async function Page() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session) {
        return <div>Not authenticated</div>;
    }
    
    return (
              <div className="container mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Create New Invoice</h1>
            <InvoiceForm />
        </div>
    );
} 