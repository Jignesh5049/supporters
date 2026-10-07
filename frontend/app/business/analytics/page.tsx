'use client';

import React from 'react';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { BarChart3, TrendingUp, Users, MapPin, Eye, MousePointerClick, MessageSquare } from 'lucide-react';

export default function BusinessAnalyticsPage() {
  const cityMetrics = [
    { city: 'Ahmedabad', leads: 42, percentage: '38%' },
    { city: 'Surat', leads: 28, percentage: '25%' },
    { city: 'Vadodara', leads: 18, percentage: '16%' },
    { city: 'Rajkot', leads: 14, percentage: '12%' },
    { city: 'Mumbai', leads: 10, percentage: '9%' }
  ];

  const weeklyTrends = [
    { day: 'Mon', views: 1820, leads: 4 },
    { day: 'Tue', views: 2150, leads: 6 },
    { day: 'Wed', views: 2480, leads: 7 },
    { day: 'Thu', views: 2900, leads: 9 },
    { day: 'Fri', views: 2750, leads: 8 },
    { day: 'Sat', views: 1600, leads: 3 },
    { day: 'Sun', views: 1120, leads: 2 },
  ];

  return (
    <div className="space-y-6">
      <BusinessNavHeader />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">30-Day Impressions</span>
          <p className="text-2xl font-black text-[#2E3192]">48,920</p>
          <span className="text-[11px] text-emerald-600 font-semibold">↑ 22.4% vs last period</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Catalogue Clicks</span>
          <p className="text-2xl font-black text-[#00AEEF]">6,410</p>
          <span className="text-[11px] text-[#667085]">13.1% CTR engagement</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Enquiries Generated</span>
          <p className="text-2xl font-black text-[#A3238E]">112</p>
          <span className="text-[11px] text-emerald-600 font-semibold">↑ 14 new this week</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">Buyer Conversion</span>
          <p className="text-2xl font-black text-emerald-600">4.8%</p>
          <span className="text-[11px] text-[#667085]">Industry benchmark: 2.5%</span>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Traffic Chart */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111111]">Weekly Social Feed Impressions</h3>
            <span className="text-xs text-[#00AEEF] font-semibold">14,820 Total</span>
          </div>

          <div className="pt-4 flex items-end justify-between h-48 gap-2">
            {weeklyTrends.map((w) => {
              const heightPercent = Math.round((w.views / 3000) * 100);
              return (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-[#F7F8FC] rounded-t-lg h-36 flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-[#2E3192] rounded-t-lg transition-all hover:bg-[#00AEEF]"
                      title={`${w.views} views, ${w.leads} leads`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#667085]">{w.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Buyer Geographic Breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111111]">Buyer Engagement by Regional Hub</h3>
            <span className="text-xs text-[#667085]">Western India Hubs</span>
          </div>

          <div className="space-y-3 pt-2">
            {cityMetrics.map((c) => (
              <div key={c.city} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#111111] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2E3192]" />
                    {c.city}
                  </span>
                  <span className="font-semibold text-[#667085]">{c.leads} enquiries ({c.percentage})</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#F7F8FC] overflow-hidden">
                  <div
                    style={{ width: c.percentage }}
                    className="h-full bg-gradient-to-r from-[#2E3192] to-[#00AEEF] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
