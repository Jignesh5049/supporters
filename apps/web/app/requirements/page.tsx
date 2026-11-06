import { Metadata } from 'next';
import Link from 'next/link';
import { listBuyerRequirements } from '@/dal/requirements';
import { RequirementCard } from '@/components/requirements/RequirementCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@supporters/ui-web/components/button';
import { Badge } from '@supporters/ui-web/components/badge';
import { Plus, FileText, Filter, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Buyer Requirements & Procurement RFQs | Supporters',
  description:
    'Browse active procurement requirements from verified Indian buyers and submit competitive wholesale quotes.',
};

interface RequirementsPageProps {
  searchParams: Promise<{
    category?: string;
    city?: string;
  }>;
}

export default async function RequirementsPage({ searchParams }: RequirementsPageProps) {
  const resolvedParams = await searchParams;
  const categoryId = resolvedParams.category;
  const city = resolvedParams.city;

  const requirements = await listBuyerRequirements({
    categoryId,
    city,
    limit: 50,
  });

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Header Banner */}
      <section className="bg-card border-b border-border py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Buyer Requirements
              </h1>
              <Badge variant="outline" className="text-xs">
                Live RFQs
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              Verified procurement demands from real buyers across India. Only verified businesses can send quotes.
            </p>
          </div>

          <Button asChild size="default" className="shadow-xs gap-1.5 shrink-0">
            <Link href="/requirements/new">
              <Plus className="size-4" />
              <span>Post Requirement</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* Trust & Policy notice */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="p-4 bg-muted/60 border border-border rounded-xl flex items-start gap-3 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 text-info shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">Verified Quotes Only:</span>
            <p>
              Requirements remain open for 30 days. To maintain quality and prevent spam, quotes are restricted to verified businesses with a valid GSTIN or Udyam certificate.
            </p>
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {requirements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No buyer requirements yet"
            description="Be the first to post a procurement requirement or check back soon for new demands in your industry."
            actionLabel="Post a Requirement"
            actionHref="/requirements/new"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requirements.map((req) => (
              <RequirementCard key={req.id} requirement={req} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
