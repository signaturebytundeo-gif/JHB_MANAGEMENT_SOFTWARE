'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Download, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Location = {
  id: string;
  name: string;
  type: string;
};

interface QuarterlyReportsClientProps {
  locations: Location[];
  availableYears: number[];
  currentUserRole: string;
}

export function QuarterlyReportsClient({
  locations,
  availableYears,
  currentUserRole
}: QuarterlyReportsClientProps) {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        quarter: selectedQuarter.toString(),
      });

      if (selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }

      const response = await fetch(`/api/reports/quarterly-distribution?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setReportData(data.data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportData) {
      toast.error('Please generate a report first');
      return;
    }

    try {
      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData,
          reportType: 'quarterly-distribution',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JHB-Quarterly-Report-Q${selectedQuarter}-${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  const quarters = [
    { value: 1, label: 'Q1 (Jan-Mar)' },
    { value: 2, label: 'Q2 (Apr-Jun)' },
    { value: 3, label: 'Q3 (Jul-Sep)' },
    { value: 4, label: 'Q4 (Oct-Dec)' },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-caribbean-green" />
            Quarterly Distribution Reports
          </CardTitle>
          <CardDescription>
            Generate detailed reports showing bottle distribution and sales performance for your restaurant locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Year Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quarter Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quarter</label>
              <Select value={selectedQuarter.toString()} onValueChange={(value) => setSelectedQuarter(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map((quarter) => (
                    <SelectItem key={quarter.value} value={quarter.value.toString()}>
                      {quarter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurant Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-caribbean-green hover:bg-caribbean-green/90"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Locations</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalLocations}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-caribbean-green" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bottles</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalBottlesDistributed.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-caribbean-green" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">
                      ${reportData.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-caribbean-green" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg per Location</p>
                    <p className="text-2xl font-bold">
                      {Math.round(reportData.summary.totalBottlesDistributed / reportData.summary.totalLocations)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-caribbean-green" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Report Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Download your report as PDF for printing or sharing with restaurant managers
                  </p>
                </div>
                <Button onClick={downloadPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location Breakdown</h3>
            {reportData.reports.map((report: any) => (
              <Card key={report.location.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{report.location.name}</span>
                    <Badge variant="outline">{report.location.type}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {report.summary.totalBottlesDistributed} bottles distributed •
                    ${report.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {report.products.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.products.map((product: any) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell>{product.size}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell className="text-right">{product.totalQuantitySold}</TableCell>
                            <TableCell className="text-right">
                              ${product.totalRevenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${product.averageSellingPrice.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No sales recorded for this location during {reportData.summary.quarterLabel}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}