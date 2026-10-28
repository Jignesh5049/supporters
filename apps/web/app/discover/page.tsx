'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ProductCard } from '@/components/product/ProductCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { BusinessCard } from '@/components/business/BusinessCard';
import { EmptyState } from '@/components/common/EmptyState';
import { CATEGORIES, CITIES } from '@/lib/mock-data';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  X,
  Building2,
  Package,
  Wrench,
  Tv,
  Shirt,
  Utensils,
  Sprout,
  Cpu,
  Hammer,
  Briefcase,
  Star,
  MapPin
} from 'lucide-react';

import { Suspense } from 'react';

function DiscoverContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = (searchParams.get('tab') as 'products' | 'services' | 'businesses') || 'products';

  const { products, services, businesses } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'businesses'>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'rating'>('recommended');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const trendingKeywords = [
    '55-inch LED TV',
    'Sheesham Furniture',
    'Cumin Seeds 25kg',
    'Banarasi Sarees',
    'Industrial Gears',
    'Corrugated Boxes',
    'Custom ERP'
  ];

  // Trade Categories matching mobile DiscoverScreen
  const tradeCategories = [
    {
      id: 'electronics',
      name: 'Electronics',
      categoryKey: 'Electronics',
      bgColor: '#EEF0FA',
      iconColor: '#2E3192',
      icon: Tv,
    },
    {
      id: 'fashion',
      name: 'Fashion',
      categoryKey: 'Fashion',
      bgColor: '#FCE7F3',
      iconColor: '#A3238E',
      icon: Shirt,
    },
    {
      id: 'food',
      name: 'Food & FMCG',
      categoryKey: 'Food',
      bgColor: '#E0F2FE',
      iconColor: '#0284C7',
      icon: Utensils,
    },
    {
      id: 'agri',
      name: 'Agri Trade',
      categoryKey: 'Agriculture',
      bgColor: '#F3E8FF',
      iconColor: '#4338CA',
      icon: Sprout,
    },
    {
      id: 'machinery',
      name: 'Machinery',
      categoryKey: 'Technology',
      bgColor: '#EDE9FE',
      iconColor: '#334155',
      icon: Cpu,
    },
    {
      id: 'hardware',
      name: 'Hardware',
      categoryKey: 'Construction',
      bgColor: '#DBEAFE',
      iconColor: '#2E3192',
      icon: Hammer,
    },
    {
      id: 'beauty',
      name: 'Beauty/Care',
      categoryKey: 'Beauty',
      bgColor: '#FCE7F3',
      iconColor: '#A3238E',
      icon: Sparkles,
    },
    {
      id: 'services',
      name: 'Services',
      categoryKey: 'Services',
      bgColor: '#E0F2FE',
      iconColor: '#0284C7',
      icon: Briefcase,
    },
  ];

  const matchCategory = (itemCategory: string, selected: string) => {
    if (selected === 'All') return true;
    const cat = (itemCategory || '').toLowerCase();
    const sel = selected.toLowerCase();
    if (cat === sel) return true;
    if (sel === 'food' || sel === 'food & fmcg') return cat.includes('food');
    if (sel === 'agri' || sel === 'agri trade' || sel === 'agriculture') return cat.includes('agri');
    if (sel === 'beauty' || sel === 'beauty/care') return cat.includes('beauty');
    if (sel === 'machinery') return cat.includes('machin') || cat.includes('technol') || cat.includes('industrial');
    if (sel === 'hardware') return cat.includes('hardware') || cat.includes('construct');
    return cat.includes(sel) || sel.includes(cat);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesQuery =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = matchCategory(p.category, selectedCategory);
        const matchesCity = selectedCity === 'All Cities' || p.businessCity === selectedCity;
        const matchesVerified = !verifiedOnly || p.businessVerified;
        const matchesRating = p.rating >= minRating;

        return matchesQuery && matchesCat && matchesCity && matchesVerified && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0; // recommended default
      });
  }, [products, searchQuery, selectedCategory, selectedCity, verifiedOnly, minRating, sortBy]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services
      .filter((s) => {
        const matchesQuery =
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = matchCategory(s.category, selectedCategory);
        const matchesCity = selectedCity === 'All Cities' || s.businessCity === selectedCity;
        const matchesVerified = !verifiedOnly || s.businessVerified;
        const matchesRating = s.rating >= minRating;

        return matchesQuery && matchesCat && matchesCity && matchesVerified && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.startingPrice - b.startingPrice;
        if (sortBy === 'price-desc') return b.startingPrice - a.startingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [services, searchQuery, selectedCategory, selectedCity, verifiedOnly, minRating, sortBy]);

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        const matchesQuery =
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.about.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCat = matchCategory(b.category, selectedCategory);
        const matchesCity = selectedCity === 'All Cities' || b.city === selectedCity;
        const matchesVerified = !verifiedOnly || b.verified;
        const matchesRating = b.rating >= minRating;

        return matchesQuery && matchesCat && matchesCity && matchesVerified && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'recommended') return b.followersCount - a.followersCount;
        return 0;
      });
  }, [businesses, searchQuery, selectedCategory, selectedCity, verifiedOnly, minRating, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedCity('All Cities');
    setVerifiedOnly(false);
    setMinRating(0);
    setSortBy('recommended');
  };

  return (
    <div className="space-y-6">

      {/* Top Banner & Search Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
              Discover Verified Products, Services & Suppliers
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-1">
              Search verified manufacturers, local wholesalers, and specialized service firms across India.
            </p>
          </div>
        </div>

        {/* Large Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#667085] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, specification, manufacturer, or raw material..."
            className="w-full pl-12 pr-4 py-3 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-sm text-[#111111] focus:outline-none focus:border-[#2E3192] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#667085] hover:text-[#111111]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Trending Keywords Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-[#667085] flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#2E3192]" />
            Trending:
          </span>
          {trendingKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setSearchQuery(kw)}
              className="px-2.5 py-1 rounded-full bg-[#F7F8FC] hover:bg-gray-200 border border-[#E5E7EB] text-[#111111] text-[11px] font-medium transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* City Filter Scroller (matching mobile Discover screen) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {CITIES.map((city) => {
          const isSelected = selectedCity === city;
          return (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#2E3192] text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-[#667085] border border-[#E5E7EB]'
              }`}
            >
              {city}
            </button>
          );
        })}
      </div>

      {/* Trade Categories Card (matching mobile Discover screen) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-[#2E3192] rounded-full" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Trade Categories
            </h2>
            {selectedCategory !== 'All' && (
              <span className="text-xs font-bold text-[#2E3192] bg-[#2E3192]/10 px-2.5 py-0.5 rounded-full">
                Active: {selectedCategory}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-[#00AEEF] hover:text-[#2E3192] transition-colors"
          >
            {selectedCategory !== 'All' ? 'Reset to All' : 'Explore 140+ >'}
          </button>
        </div>

        {/* 8 Trade Categories Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
          {tradeCategories.map((cat) => {
            const isCatActive =
              selectedCategory.toLowerCase() === cat.name.toLowerCase() ||
              selectedCategory.toLowerCase() === cat.categoryKey.toLowerCase();
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isCatActive) {
                    setSelectedCategory('All');
                  } else {
                    setSelectedCategory(cat.categoryKey);
                  }
                }}
                className="flex flex-col items-center gap-2 group transition-transform active:scale-95 text-center"
              >
                <div
                  style={{ backgroundColor: cat.bgColor }}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 shadow-2xs ${
                    isCatActive ? 'ring-2 ring-[#2E3192] ring-offset-2 shadow-sm' : ''
                  }`}
                >
                  <Icon
                    className="w-6 h-6 sm:w-7 sm:h-7 transition-colors"
                    style={{ color: cat.iconColor }}
                  />
                </div>
                <span
                  className={`text-[11px] sm:text-xs leading-tight transition-colors line-clamp-1 ${
                    isCatActive
                      ? 'font-bold text-[#2E3192]'
                      : 'font-medium text-[#111111] group-hover:text-[#2E3192]'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tabs (Products, Services, Businesses) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-[#2E3192] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({filteredProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'services'
                ? 'bg-[#00AEEF] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services ({filteredServices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'businesses'
                ? 'bg-[#2E3192] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Businesses ({filteredBusinesses.length})</span>
          </button>
        </div>

        {/* Right Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#667085] font-semibold">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold text-[#111111] focus:outline-none focus:border-[#2E3192]"
          >
            <option value="recommended">Recommended</option>
            <option value="rating">Highest Rated</option>
            {activeTab !== 'businesses' && (
              <>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Unified Horizontal Filter Toolbar (eliminates narrow squeezed sidebar) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Verified Suppliers Toggle Chip */}
          <button
            type="button"
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              verifiedOnly
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100 border border-[#E5E7EB]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${verifiedOnly ? 'text-emerald-600' : 'text-[#667085]'}`} />
            <span>Verified Suppliers Only</span>
          </button>

          {/* Rating Filter Dropdown */}
          <div className="inline-flex items-center gap-1.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-[#667085]">Min Rating:</span>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-transparent font-bold text-[#111111] focus:outline-none cursor-pointer"
            >
              <option value={0}>Any Rating</option>
              <option value={4.5}>4.5★ and above</option>
              <option value={4.8}>4.8★ and above</option>
            </select>
          </div>

          {/* Active Category Chip */}
          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2E3192]/10 text-[#2E3192] text-xs font-bold border border-[#2E3192]/20">
              <span>Category: {selectedCategory}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="hover:text-[#2E3192]/70 ml-0.5"
                title="Remove category filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Active City Chip */}
          {selectedCity !== 'All Cities' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00AEEF]/10 text-[#00AEEF] text-xs font-bold border border-[#00AEEF]/20">
              <MapPin className="w-3 h-3 text-[#00AEEF]" />
              <span>{selectedCity}</span>
              <button
                type="button"
                onClick={() => setSelectedCity('All Cities')}
                className="hover:text-[#00AEEF]/70 ml-0.5"
                title="Remove city filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Reset Filters */}
          {(selectedCategory !== 'All' || selectedCity !== 'All Cities' || verifiedOnly || minRating > 0 || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        <span className="text-xs text-[#667085] ml-auto">
          Showing {activeTab === 'products' ? filteredProducts.length : activeTab === 'services' ? filteredServices.length : filteredBusinesses.length} results
        </span>
      </div>

      {/* Results Grid - Full Width, Beautiful & Unified across the whole web */}
      <div>
        {activeTab === 'products' && (
          filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="We couldn't find any products matching your current filters. Try relaxing your location or category selection."
              actionLabel="Clear Filters"
              onAction={resetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )
        )}

        {activeTab === 'services' && (
          filteredServices.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No services found"
              description="No verified services match your criteria. Try expanding your search location."
              actionLabel="Clear Filters"
              onAction={resetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )
        )}

        {activeTab === 'businesses' && (
          filteredBusinesses.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No businesses found"
              description="No business listings matched your query. Try searching for city hubs like Ahmedabad, Surat, or Vadodara."
              actionLabel="Clear Filters"
              onAction={resetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBusinesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#667085]">Loading discovery directory...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
