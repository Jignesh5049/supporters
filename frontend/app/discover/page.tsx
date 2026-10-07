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
  Wrench
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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesQuery =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
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
        const matchesCat = selectedCategory === 'All' || s.category.toLowerCase() === selectedCategory.toLowerCase();
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
        const matchesCat = selectedCategory === 'All' || b.category.toLowerCase() === selectedCategory.toLowerCase();
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
            <span className="text-xs font-bold uppercase tracking-wider text-[#00AEEF]">
              Marketplace & Network Directory
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#111111] mt-1">
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

        {/* Sort and Filter controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#667085]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2E3192]"
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

          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded-lg text-xs font-semibold bg-white text-[#111111]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout: Filter Sidebar + Result Grid */}
      <div className="flex gap-6 items-start">
        {/* Desktop Filter Sidebar */}
        <aside
          className={`w-64 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-5 shrink-0 ${
            showMobileFilters ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#2E3192]" />
              <span>Filters</span>
            </h3>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#00AEEF] hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2 uppercase tracking-wider">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-lg text-[#111111] focus:outline-none focus:border-[#2E3192]"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location / City Filter */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2 uppercase tracking-wider">
              Commercial Hub (City)
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs p-2 bg-[#F7F8FC] border border-[#E5E7EB] rounded-lg text-[#111111] focus:outline-none focus:border-[#2E3192]"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111111]">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 text-[#2E3192] rounded border-gray-300 focus:ring-[#2E3192]"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00AEEF]" />
                <span>Verified Businesses Only</span>
              </span>
            </label>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2 uppercase tracking-wider">
              Minimum Rating
            </label>
            <div className="space-y-1.5 text-xs">
              {[0, 4.5, 4.8].map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === val}
                    onChange={() => setMinRating(val)}
                    className="text-[#2E3192] focus:ring-[#2E3192]"
                  />
                  <span>{val === 0 ? 'Any Rating' : `${val}★ and above`}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="flex-1 min-w-0">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBusinesses.map((b) => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            )
          )}
        </div>
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
