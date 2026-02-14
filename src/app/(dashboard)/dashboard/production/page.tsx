import { Factory } from 'lucide-react';

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Production Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Track hot sauce batches from raw ingredients through bottling and packaging.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-caribbean-green/10 flex items-center justify-center mb-6">
          <Factory className="h-8 w-8 text-caribbean-green" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 2</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Batch creation, recipe management, production scheduling, yield tracking, and quality control logging.
        </p>
      </div>
    </div>
  );
}
