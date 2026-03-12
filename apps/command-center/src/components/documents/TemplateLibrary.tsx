import { FileText, Download, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TemplateListItem } from '@/app/actions/documents';

// Static descriptions keyed by template name — no schema change needed
const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  'Invoice Template':
    'Standard JHB invoice template with Net 30 terms, company branding, and line item breakdown',
  'Purchase Order Template':
    'Purchase order form for supplier and co-packer orders with delivery terms',
  'Wholesale Agreement Template':
    'Wholesale distribution agreement with pricing tiers, territory, and payment terms',
};

function getDescription(name: string): string {
  return TEMPLATE_DESCRIPTIONS[name] ?? `Standard ${name.toLowerCase()} for JHB business operations`;
}

interface TemplateLibraryProps {
  templates: TemplateListItem[];
}

export function TemplateLibrary({ templates }: TemplateLibraryProps) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No templates available. Templates will appear here once seeded.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => {
        const hasFile = Boolean(template.currentBlobUrl);
        const description = getDescription(template.name);

        return (
          <Card
            key={template.id}
            className="border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs font-medium">
                    Template
                  </Badge>
                </div>
                {hasFile ? (
                  <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                    Available
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base mt-2">{template.name}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

              {hasFile ? (
                <a
                  href={template.currentBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </a>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Template file pending upload by admin</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
