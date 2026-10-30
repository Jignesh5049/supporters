'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { ServiceCard } from '@/components/service/ServiceCard';
import { ShareModal } from '@/components/common/ShareModal';
import {
  Bookmark,
  Share2,
  Building2,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Send,
  ArrowRight,
  ShieldCheck,
  Wrench
} from 'lucide-react';

import { Suspense } from 'react';

function ServiceDetailContent() {
  const params = useParams();
  const serviceId = params?.id as string;
  const { services, businesses, savedServiceIds, toggleSaveService, openEnquiryModal } = useApp();

  const service = services.find((s) => s.id === serviceId) || services[0];
  const business = businesses.find((b) => b.id === service?.businessId) || businesses[0];

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const isSaved = savedServiceIds.includes(service.id);

  const relatedServices = services.filter((s) => s.id !== service.id);

  return (
    <div className="space-y-8">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-2 text-xs text-[#667085] truncate">
          <Link href="/" className="hover:text-[#2E3192]">Home</Link>
          <span>/</span>
          <Link href="/discover?tab=services" className="hover:text-[#2E3192]">Services</Link>
          <span>/</span>
          <span className="text-[#00AEEF] font-semibold">{service.category}</span>
          <span>/</span>
          <span className="text-[#111111] font-medium truncate max-w-xs">{service.title}</span>
        </nav>
      </div>

      {/* Main Service Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs">
        {/* Left: Image (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-16/11 w-full bg-[#F7F8FC] rounded-2xl overflow-hidden border border-[#E5E7EB]">
            <Image
              src={service.images[0]}
              alt={service.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00AEEF]" />
              <span>{service.availability}</span>
            </div>
          </div>
        </div>

        {/* Center: Details (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#00AEEF] uppercase tracking-wider">
                {service.category}
              </span>
              <span>·</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#111111]">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{service.rating}</span>
                <span className="text-[#667085] font-normal">({service.reviewCount} client reviews)</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#111111] leading-snug">
              {service.title}
            </h1>
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-[#F7F8FC] border border-[#E5E7EB] rounded-2xl">
            <span className="text-xs text-[#667085] block">Starting Fee</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#2E3192]">
                ₹{service.startingPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-[#667085]">
                / {service.priceUnit}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#667085]">
              <span>Turnaround:</span>
              <span className="font-bold text-[#111111]">{service.turnaroundTime}</span>
            </div>
          </div>

          {/* Service Area */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-50/50 border border-cyan-100 text-xs">
            <MapPin className="w-4 h-4 text-[#00AEEF] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#00AEEF]">Service Footprint:</span>
              <p className="text-[#667085] mt-0.5">{service.serviceArea}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5">
              Service Scope & Deliverables
            </h3>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              {service.description}
            </p>
          </div>

          {/* Key Deliverables Bullet Points */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-[#111111]">Key Inclusions:</h4>
            {service.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-[#111111]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Save & Share */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => toggleSaveService(service.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                isSaved
                  ? 'bg-cyan-50 border-[#00AEEF] text-[#00AEEF]'
                  : 'bg-white border-[#E5E7EB] text-[#111111] hover:bg-gray-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved to Collection' : 'Save Service'}</span>
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E5E7EB] text-[#111111] hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Right: Provider Card (3 cols) */}
        <div className="lg:col-span-3 space-y-4 lg:border-l lg:border-[#E5E7EB] lg:pl-6">
          <div className="p-4 bg-[#F7F8FC] border border-[#E5E7EB] rounded-2xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
              Service Provider
            </span>

            <div className="flex items-center gap-3">
              <Avatar
                src={business.avatar}
                name={business.name}
                size="md"
                verified={business.verified}
              />
              <div className="min-w-0">
                <Link
                  href={`/business/${business.id}`}
                  className="text-sm font-bold text-[#111111] hover:text-[#00AEEF] line-clamp-1"
                >
                  {business.name}
                </Link>
                <p className="text-xs text-[#667085]">
                  {business.city}, {business.state}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#667085] pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Provider on Supporters</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00AEEF]" />
                <span>Response: {business.responseRate}</span>
              </div>
            </div>

            <Link
              href={`/business/${business.id}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-center text-xs font-semibold text-[#00AEEF] bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span>View Full Agency Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5">
            <button
              onClick={() =>
                openEnquiryModal({
                  title: service.title,
                  businessName: business.name,
                  businessId: business.id
                })
              }
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0098d4] rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Request Service Scope & Quote</span>
            </button>

            <Link
              href="/messages"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#2E3192] bg-blue-50/70 hover:bg-blue-100/70 border border-[#2E3192]/20 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Team</span>
            </Link>

            <a
              href={`tel:${business.phone}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#111111] bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Call: {business.phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111111]">
              Other Specialized Services
            </h2>
            <Link href="/discover?tab=services" className="text-xs font-semibold text-[#00AEEF] hover:underline">
              Explore All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedServices.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={service.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
}

export default function ServiceDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#667085]">Loading service details...</div>}>
      <ServiceDetailContent />
    </Suspense>
  );
}
