import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, Zap, HeartHandshake, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-6 max-w-4xl">

      {/* Brand Hero */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
        <div className="w-16 h-16 rounded-2xl bg-[#2E3192] text-white flex items-center justify-center mx-auto shadow-md">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z" fill="#00AEEF"/>
            <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
            <circle cx="15" cy="8" r="1.5" fill="#A3238E"/>
          </svg>
        </div>

        <h1 className="text-3xl font-black text-[#2E3192] tracking-tight">
          About Supporters
        </h1>
        <p className="text-sm font-semibold text-[#00AEEF] uppercase tracking-wider">
          Social Commerce + Business Discovery + Verified B2B Trade
        </p>

        <p className="text-xs sm:text-sm text-[#667085] max-w-2xl mx-auto leading-relaxed pt-2">
          Supporters is an original Indian social-business network built to bridge regional manufacturers, wholesalers, distributors, retailers, and service firms with direct visibility and zero intermediary transaction markups.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#111111]">Our Mission</h2>
          <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
            To democratize commerce discovery across Indian industrial hubs like Ahmedabad, Surat, Rajkot, Vadodara, Pune, and Bengaluru—enabling micro, small, and medium businesses to showcase their craftsmanship without costly middleman lock-in.
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#111111]">The Core Philosophy</h2>
          <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
            Commerce should feel social, transparent, and direct. When buyers see live workshop updates, video runs, and genuine customer testimonials inside a social feed, business relationships become durable and trust-driven.
          </p>
        </div>
      </div>

      {/* Platform Architecture & Specs */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
          Platform Information & Governance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#667085]">
          <div>
            <span className="font-bold text-[#111111] block mb-1">Architecture</span>
            <p>Built with Next.js App Router, TypeScript, and clean responsive Tailwind CSS.</p>
          </div>
          <div>
            <span className="font-bold text-[#111111] block mb-1">Version</span>
            <p className="font-mono text-[#2E3192]">v2.4.0 (Production Stable)</p>
          </div>
          <div>
            <span className="font-bold text-[#111111] block mb-1">Headquarters</span>
            <p>Naroda GIDC Tech Park, Ahmedabad, Gujarat 382330</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex flex-wrap gap-4 text-xs">
          <a href="mailto:hello@supporters.in" className="flex items-center gap-1.5 text-[#2E3192] font-semibold hover:underline">
            <Mail className="w-4 h-4" />
            <span>hello@supporters.in</span>
          </a>
          <a href="tel:+919825014890" className="flex items-center gap-1.5 text-[#00AEEF] font-semibold hover:underline">
            <Phone className="w-4 h-4" />
            <span>+91 98250 14890</span>
          </a>
          <span className="flex items-center gap-1.5 text-[#667085]">
            <Globe className="w-4 h-4" />
            <span>https://supporters.in</span>
          </span>
        </div>
      </div>
    </div>
  );
}
