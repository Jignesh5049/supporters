'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { ProductCard } from '@/components/product/ProductCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EmptyState } from '@/components/common/EmptyState';
import { FollowListModal } from '@/components/common/FollowListModal';
import { MOCK_REVIEWS } from '@/lib/mock-data';
import {
  MapPin,
  Building2,
  Users,
  Star,
  ShieldCheck,
  Phone,
  MessageSquare,
  Globe,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  Send,
  CheckCircle2,
  Package,
  Wrench,
} from 'lucide-react';

import { Suspense } from 'react';

function BusinessProfileContent() {
  const params = useParams();
  const businessId = params?.id as string;
  const {
    businesses,
    products,
    services,
    posts,
    followedBusinessIds,
    toggleFollowBusiness,
    openConversationWithBusiness,
    openEnquiryModal,
    userBusiness,
  } = useApp();

  const business = businesses.find((b) => b.id === businessId) || businesses[0];
  const isFollowing = followedBusinessIds.includes(business.id);
  const isOwner = userBusiness?.id === business.id;

  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'services' | 'posts' | 'reviews'
  >('overview');
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  const businessProducts = products.filter((p) => p.businessId === business.id);
  const businessServices = services.filter((s) => s.businessId === business.id);
  // Requirements: Only published posts should appear on the public storefront
  const businessPosts = posts.filter(
    (p) => p.businessId === business.id && p.postStatus !== 'Draft' && p.postStatus !== 'Archived',
  );

  const getInstagramUrl = (handleOrUrl?: string) => {
    if (!handleOrUrl) return '#';
    if (handleOrUrl.startsWith('http')) return handleOrUrl;
    const cleanHandle = handleOrUrl.replace('@', '').trim();
    return `https://instagram.com/${cleanHandle}`;
  };

  const getDirectionsUrl = () => {
    if (business.mapUrl) return business.mapUrl;
    const query = encodeURIComponent(
      business.fullAddress ||
        `${business.addressLine || ''} ${business.city} ${business.state}`.trim() ||
        business.name,
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="space-y-6">
      {/* Owner Switcher Banner */}
      {isOwner && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-teal-900">
                You are viewing your public storefront as customers see it
              </p>
              <p className="text-[11px] text-teal-700">
                Switch to your owner management dashboard to edit products, posts, or settings
              </p>
            </div>
          </div>
          <Link
            href="/business/manage"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors self-start sm:self-auto shrink-0"
          >
            <span>Open Business Hub (Manager)</span>
          </Link>
        </div>
      )}

      {/* Top Breadcrumb/Subtitle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#667085]">Business Profile · {business.name}</span>
      </div>
      {/* Business Cover & Header Banner */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        {/* Cover Banner */}
        <div className="relative h-48 sm:h-64 w-full bg-gray-100">
          <Image
            src={business.coverImage}
            alt={business.name}
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Profile Content */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="-mt-14 sm:-mt-16 shrink-0">
                <Avatar
                  src={business.avatar}
                  name={business.name}
                  size="xl"
                  verified={business.verified}
                  className="ring-4 ring-white shadow-md bg-white"
                />
              </div>
              <div className="space-y-0.5 pt-1 sm:pt-0 sm:pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111]">{business.name}</h1>
                  {business.verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00AEEF] bg-[#00AEEF]/10 px-2 py-0.5 rounded-full">
                      ✓ Verified Supplier
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#667085] flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#2E3192]">{business.category}</span>
                  <span>·</span>
                  <span>{business.businessType}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {business.city}, {business.state}
                  </span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 sm:pb-1">
              <button
                onClick={() => toggleFollowBusiness(business.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  isFollowing
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-[#2E3192] text-white hover:bg-[#242775] shadow-xs'
                }`}
              >
                {isFollowing ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Following</span>
                  </>
                ) : (
                  <span>+ Follow</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => openConversationWithBusiness(business.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#00AEEF] bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact Supplier</span>
              </button>

              <button
                onClick={() =>
                  openEnquiryModal({
                    title: `General B2B Inquiry for ${business.name}`,
                    businessName: business.name,
                    businessId: business.id,
                  })
                }
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#111111] bg-[#F7F8FC] hover:bg-gray-100 border border-[#E5E7EB] rounded-xl transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#2E3192]" />
                <span>Enquire</span>
              </button>
            </div>
          </div>

          {/* Followers, Rating and Response Metrics */}
          <div className="flex items-center gap-6 pt-3 border-t border-[#E5E7EB] text-xs text-[#667085]">
            <button
              type="button"
              onClick={() => setShowFollowersModal(true)}
              className="flex items-center gap-1.5 hover:text-[#2E3192] transition-colors cursor-pointer group text-left"
              title="Click to view followers"
            >
              <Users className="w-4 h-4 text-[#2E3192]" />
              <span className="font-extrabold text-[#111111] group-hover:text-[#2E3192] underline decoration-dotted decoration-gray-300">
                {business.followersCount.toLocaleString('en-IN')}
              </span>
              <span className="group-hover:text-[#2E3192]">followers</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-extrabold text-[#111111]">{business.rating}</span>
              <span>({business.reviewCount} reviews)</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Responds in {business.responseRate}</span>
            </div>
          </div>

          {/* Verified Business Contact Number Banner (Shown when enabled in settings) */}
          {business.showPhone && business.phone && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                      Official Contact Number
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-700">
                      Available for Trade
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-gray-900 mt-0.5">{business.phone}</p>
                </div>
              </div>
              <a
                href={`tel:${business.phone}`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </a>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="px-6 sm:px-8 border-t border-[#E5E7EB] bg-[#F7F8FC] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'products', label: `Products (${businessProducts.length})` },
            { id: 'services', label: `Services (${businessServices.length})` },
            { id: 'posts', label: `Updates & Feed (${businessPosts.length})` },
            { id: 'reviews', label: `Reviews (${business.reviewCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#2E3192] text-[#2E3192] bg-white'
                  : 'border-transparent text-[#667085] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About Box */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#111111]">About {business.name}</h3>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">{business.about}</p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {business.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium bg-[#F7F8FC] text-[#2E3192] border border-[#E5E7EB] px-2.5 py-1 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Featured Products */}
            {businessProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#111111]">Featured Products</h3>
                  <button
                    onClick={() => setActiveTab('products')}
                    className="text-xs font-semibold text-[#00AEEF] hover:underline"
                  >
                    View All ({businessProducts.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {businessProducts.slice(0, 2).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Latest Social Posts */}
            {businessPosts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#111111]">Latest Social Updates</h3>
                <div className="space-y-4">
                  {businessPosts.slice(0, 2).map((post) => (
                    <FeedPostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Business Info Card */}
          <div className="space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
                Commercial Details
              </h3>

              <div className="space-y-3 text-xs text-[#667085]">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-[#2E3192] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#111111] block">Establishment</span>
                    <span>Incorporated in {business.establishedYear}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#2E3192] shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="font-semibold text-[#111111] block">Facility Address</span>
                    <span className="text-[#667085] block">
                      {business.fullAddress ||
                        `${business.addressLine || ''}, ${business.city}, ${business.state}`}
                    </span>
                    <a
                      href={getDirectionsUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Get Directions ↗</span>
                    </a>
                  </div>
                </div>

                {business.openingHours && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#2E3192] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#111111] block">Opening Hours</span>
                      <span className="text-[#667085]">{business.openingHours}</span>
                      {business.availabilityStatus && (
                        <span className="block text-[11px] font-bold text-emerald-600 mt-0.5">
                          ● {business.availabilityStatus}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {business.instagram && (
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 text-[#A3238E] font-bold shrink-0 mt-0.5">📷</div>
                    <div>
                      <span className="font-semibold text-[#111111] block">Instagram</span>
                      <a
                        href={getInstagramUrl(business.instagram)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#A3238E] font-bold hover:underline"
                      >
                        @{business.instagram.replace('@', '').split('/').pop()} ↗
                      </a>
                    </div>
                  </div>
                )}

                {business.gstin && (
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#111111] block">GST Verification</span>
                      <span className="font-mono">{business.gstin}</span>
                    </div>
                  </div>
                )}

                {business.showPhone && business.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#111111] block">Phone / WhatsApp</span>
                      <a
                        href={`tel:${business.phone}`}
                        className="hover:text-[#2E3192] font-semibold text-[#2E3192]"
                      >
                        {business.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-[#111111] block">Business Email</span>
                    <a href={`mailto:${business.email}`} className="hover:text-[#2E3192]">
                      {business.email}
                    </a>
                  </div>
                </div>

                {business.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-[#2E3192] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#111111] block">Official Website</span>
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00AEEF] hover:underline"
                      >
                        {business.website} ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === 'products' && (
        <div>
          {businessProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products listed yet"
              description="This business hasn't published products to their catalog."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businessProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERVICES */}
      {activeTab === 'services' && (
        <div>
          {businessServices.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No services listed yet"
              description="This business hasn't published specialized service offerings."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {businessServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: POSTS */}
      {activeTab === 'posts' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {businessPosts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No social updates posted yet"
              description="Follow this business to receive notifications when they post."
            />
          ) : (
            businessPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
          )}
        </div>
      )}

      {/* TAB 5: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="text-4xl font-black text-[#2E3192]">{business.rating}</span>
                <div className="flex justify-center text-amber-400 text-sm mt-0.5">★★★★★</div>
                <span className="text-xs text-[#667085]">{business.reviewCount} ratings</span>
              </div>
              <div className="h-12 w-[1px] bg-[#E5E7EB] hidden sm:block" />
              <div className="text-xs text-[#667085] space-y-1">
                <p>100% verified trade partners</p>
                <p>98% on-time dispatch rate</p>
                <p>94% reorder rate within 90 days</p>
              </div>
            </div>

            <button
              onClick={() =>
                alert('Review submission open for buyers with completed trade enquiry orders.')
              }
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
            >
              Write Trade Review
            </button>
          </div>

          <div className="space-y-4">
            {MOCK_REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={rev.authorAvatar} name={rev.authorName} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-[#111111]">{rev.authorName}</h4>
                      <p className="text-[10px] text-[#667085]">
                        {rev.authorCity} · Verified Buyer
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#667085]">{rev.date}</span>
                </div>
                <div className="flex text-amber-400 text-xs">{'★'.repeat(rev.rating)}</div>
                <p className="text-xs text-[#111111] leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instagram-style Business Followers Modal */}
      <FollowListModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
        subtitle={`${business.name} · ${business.followersCount.toLocaleString('en-IN')} Followers`}
        items={businesses
          .filter((b) => b.id !== business.id)
          .map((b) => ({
            id: b.id,
            name: b.name,
            username: b.slug,
            avatar: b.avatar,
            verified: b.verified,
            category: b.category,
            city: b.city,
            businessType: b.businessType,
          }))}
      />
    </div>
  );
}

export default function BusinessProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#667085]">Loading business profile...</div>
      }
    >
      <BusinessProfileContent />
    </Suspense>
  );
}
