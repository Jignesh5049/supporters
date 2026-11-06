import { Metadata } from 'next';
import Link from 'next/link';
import { searchAll } from '@/dal/search';
import { type SearchType } from '@supporters/shared';
import { SearchBar } from './search-bar';
import { RequirementCard } from '@/components/requirements/RequirementCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Building2, Package, Wrench, FileText, Search as SearchIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@supporters/ui-web/components/badge';
import { Card } from '@supporters/ui-web/components/card';

export const metadata: Metadata = {
  title: 'Search | Supporters',
  description:
    'Search Indian businesses, wholesale products, commercial services, and active buyer requirements.',
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    category?: string;
    city?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const activeType = (resolvedParams.type as SearchType) || 'all';
  const category = resolvedParams.category;
  const city = resolvedParams.city;

  const results = await searchAll({
    q,
    type: activeType,
    category,
    city,
  });

  const { counts, businesses, products, services, requirements } = results;

  const tabs: Array<{ id: SearchType; label: string; count: number; icon: React.ElementType }> = [
    { id: 'all', label: 'All Results', count: counts.all, icon: SearchIcon },
    { id: 'businesses', label: 'Businesses', count: counts.businesses, icon: Building2 },
    { id: 'products', label: 'Products', count: counts.products, icon: Package },
    { id: 'services', label: 'Services', count: counts.services, icon: Wrench },
    { id: 'requirements', label: 'Buyer Requirements', count: counts.requirements, icon: FileText },
  ];

  const hasAnyResults = counts.all > 0;

  return (
    <main className="min-h-screen bg-background pb-16">
      {/* Search Header Banner */}
      <section className="bg-card border-b border-border py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {q ? `Search results for "${q}"` : 'Search Supporters'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover verified manufacturers, wholesale suppliers, services, and live procurement RFQs.
            </p>
          </div>

          <SearchBar initialQuery={q} activeType={activeType} />

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeType === tab.id;
              const params = new URLSearchParams();
              if (q) params.set('q', q);
              if (tab.id !== 'all') params.set('type', tab.id);

              return (
                <Link
                  key={tab.id}
                  href={`/search?${params.toString()}`}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <Badge
                      variant={isActive ? 'secondary' : 'default'}
                      className="ml-1 text-[10px] px-1.5 py-0 h-4"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Results Container */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {!q && !hasAnyResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
            <Card className="p-6 bg-card border-border rounded-2xl space-y-3">
              <Building2 className="size-8 text-primary" />
              <h2 className="text-base font-bold text-foreground">Verified Suppliers</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with genuine manufacturers and exporters with verified GSTIN and business credentials.
              </p>
              <Link href="/discover" className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1">
                Browse Directory <ArrowRight className="size-3" />
              </Link>
            </Card>

            <Card className="p-6 bg-card border-border rounded-2xl space-y-3">
              <Package className="size-8 text-info" />
              <h2 className="text-base font-bold text-foreground">Wholesale Catalog</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Explore thousands of verified product listings with clear MOQs and direct manufacturer pricing.
              </p>
              <Link href="/discover?tab=products" className="inline-flex items-center text-xs font-semibold text-info hover:underline gap-1">
                Browse Products <ArrowRight className="size-3" />
              </Link>
            </Card>

            <Card className="p-6 bg-card border-border rounded-2xl space-y-3">
              <FileText className="size-8 text-highlight" />
              <h2 className="text-base font-bold text-foreground">Buyer Requirements</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Post your procurement needs or quote on verified B2B buyer inquiries in your industry.
              </p>
              <Link href="/requirements" className="inline-flex items-center text-xs font-semibold text-highlight hover:underline gap-1">
                View RFQs <ArrowRight className="size-3" />
              </Link>
            </Card>
          </div>
        )}

        {q && !hasAnyResults && (
          <EmptyState
            title="No matching results found"
            description={`We could not find any matches for "${q}". Try checking your spelling, using broader search terms, or exploring popular categories.`}
            actionLabel="Clear Search"
            actionHref="/search"
          />
        )}

        {/* Results view */}
        {hasAnyResults && (
          <div className="space-y-8">
            {/* Businesses Section */}
            {(activeType === 'all' || activeType === 'businesses') && businesses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Building2 className="size-5 text-primary" />
                    <span>Businesses ({counts.businesses})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {businesses.map((b) => (
                    <Card key={b.id} className="p-4 border-border bg-card rounded-2xl hover:shadow-xs transition-all">
                      <Link href={`/business/${b.slug}`} className="block space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate">
                            {b.name}
                          </h3>
                          {b.isVerified && (
                            <CheckCircle2 className="size-3.5 text-info shrink-0" />
                          )}
                        </div>
                        {b.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {b.city.name}, {b.city.stateCode}
                          </p>
                        )}
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            {(activeType === 'all' || activeType === 'products') && products.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Package className="size-5 text-primary" />
                    <span>Products ({counts.products})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {products.map((p) => (
                    <Card key={p.id} className="p-4 border-border bg-card rounded-2xl hover:shadow-xs transition-all">
                      <Link href={`/product/${p.id}`} className="block space-y-2">
                        <h3 className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                          {p.title}
                        </h3>
                        {p.price && (
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-primary text-sm">
                              ₹{(p.price.amountPaise / 100).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Services Section */}
            {(activeType === 'all' || activeType === 'services') && services.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Wrench className="size-5 text-primary" />
                    <span>Services ({counts.services})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {services.map((s) => (
                    <Card key={s.id} className="p-4 border-border bg-card rounded-2xl hover:shadow-xs transition-all">
                      <Link href={`/service/${s.id}`} className="block space-y-2">
                        <h3 className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
                          {s.title}
                        </h3>
                        {s.price && (
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-primary text-sm">
                              Starts at ₹{(s.price.amountPaise / 100).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements Section */}
            {(activeType === 'all' || activeType === 'requirements') && requirements.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <span>Buyer Requirements ({counts.requirements})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requirements.map((req) => (
                    <RequirementCard key={req.id} requirement={req} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
