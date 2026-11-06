'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Service } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { Bookmark, MapPin, Star, Clock } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { savedServiceIds, toggleSaveService, openEnquiryModal } = useApp();
  const isSaved = savedServiceIds.includes(service.id);

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col group">
      {/* Service Image */}
      <div className="relative aspect-16/10 w-full bg-gray-100 overflow-hidden">
        <Link href={`/service/${service.id}`} className="block w-full h-full relative">
          <Image
            src={service.images[0]}
            alt={service.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </Link>

        {/* Save Bookmark button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleSaveService(service.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs ${
            isSaved ? 'bg-info text-white' : 'bg-white/85 text-foreground hover:bg-white'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save service'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Availability Badge */}
        <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Clock className="w-3 h-3 text-info" />
          <span>{service.availability}</span>
        </span>
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Business Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar
            src={service.businessAvatar}
            name={service.businessName}
            size="xs"
            verified={service.businessVerified}
          />
          <Link
            href={`/business/${service.businessId}`}
            className="text-xs font-semibold text-muted-foreground hover:text-info truncate flex-1"
          >
            {service.businessName}
          </Link>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
            <MapPin className="w-3 h-3" />
            {service.businessCity}
          </span>
        </div>

        {/* Title */}
        <Link href={`/service/${service.id}`}>
          <h3 className="text-sm font-bold text-foreground group-hover:text-info transition-colors line-clamp-2 leading-snug">
            {service.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
          {service.description}
        </p>

        {/* Price & Rating */}
        <div className="mt-auto pt-3 border-t border-border flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-muted-foreground block">Starting from</span>
            <span className="text-base font-black text-primary">
              ₹{service.startingPrice.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">/{service.priceUnit}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-foreground">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{service.rating}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 pt-2 flex items-center gap-2">
          <Link
            href={`/service/${service.id}`}
            className="flex-1 py-2 text-center text-xs font-semibold text-info bg-cyan-50/70 hover:bg-cyan-100/70 rounded-xl transition-colors"
          >
            View Scope
          </Link>
          <button
            type="button"
            onClick={() =>
              openEnquiryModal({
                title: service.title,
                businessName: service.businessName,
                businessId: service.businessId,
              })
            }
            className="flex-1 py-2 text-center text-xs font-semibold text-white bg-info hover:bg-info rounded-xl transition-colors shadow-2xs"
          >
            Enquire Now
          </button>
        </div>
      </div>
    </div>
  );
}
