import { notFound } from 'next/navigation';
import { getInvoiceById } from '@/app/actions/invoices';
import { InvoiceDetailClient } from '@/components/finance/InvoiceDetailClient';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return <InvoiceDetailClient invoice={invoice} />;
}
