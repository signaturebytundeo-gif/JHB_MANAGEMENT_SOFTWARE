import { Metadata } from 'next';
import { verifySession } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { QuarterlyReportsClient } from '@/components/reports/QuarterlyReportsClient';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Reports | Jamaica House Brand',
  description: 'Generate quarterly distribution and sales reports',
};

async function getLocationsAndData() {
  // Get restaurant locations for filtering
  const locations = await prisma.location.findMany({
    where: {
      type: {
        in: ['RESTAURANT', 'PRODUCTION']
      },
      isActive: true,
    },
    orderBy: { name: 'asc' },
  });

  // Get available years from sales data
  const salesData = await prisma.sale.findMany({
    select: { saleDate: true },
    orderBy: { saleDate: 'asc' },
  });

  const availableYears = [...new Set(
    salesData.map(sale => sale.saleDate.getFullYear())
  )].sort((a, b) => b - a); // Descending order

  return {
    locations,
    availableYears: availableYears.length > 0 ? availableYears : [new Date().getFullYear()],
  };
}

export default async function ReportsPage() {
  const session = await verifySession();

  // Only admins and managers can access reports
  if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const { locations, availableYears } = await getLocationsAndData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Generate quarterly distribution reports for restaurant locations and cost analysis
        </p>
      </div>

      <QuarterlyReportsClient
        locations={locations}
        availableYears={availableYears}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
