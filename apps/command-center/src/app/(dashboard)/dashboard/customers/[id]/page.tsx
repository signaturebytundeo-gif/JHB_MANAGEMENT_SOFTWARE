import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getCRMCustomerById } from '@/app/actions/crm-customers';
import { CustomerDetail } from '@/components/crm/CustomerDetail';

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const customer = await getCRMCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/dashboard/customers"
          className="hover:text-foreground transition-colors"
        >
          Customers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">
          {customer.firstName} {customer.lastName}
        </span>
      </nav>

      <CustomerDetail customer={customer} />
    </div>
  );
}
