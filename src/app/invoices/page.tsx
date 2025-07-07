import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import InvoicesPage from "@/components/invoices/invoices-page";

export default async function Page() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    
    if (!session) {
        return <div>Not authenticated</div>;
    }
    
    return <InvoicesPage />;
} 