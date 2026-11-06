'use client';

import React from 'react';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  Eye,
  MousePointerClick,
  MessageSquare,
} from 'lucide-react';

export default function BusinessAnalyticsPage() {
  const cityMetrics = [
    { city: 'Ahmedabad', leads: 42, percentage: '38%' },
    { city: 'Surat', leads: 28, percentage: '25%' },
    { city: 'Vadodara', leads: 18, percentage: '16%' },
    { city: 'Rajkot', leads: 14, percentage: '12%' },
    { city: 'Mumbai', leads: 10, percentage: '9%' },
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
    <div className="space-y-6 pb-12">
      <BusinessNavHeader />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            30-Day Impressions
          </span>
          <p className="text-2xl font-black text-primary">48,920</p>
          <span className="text-[11px] text-success font-semibold">↑ 22.4% vs last period</span>
        </Card>

        <Card className="bg-card border-border rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Catalogue Clicks
          </span>
          <p className="text-2xl font-black text-info">6,410</p>
          <span className="text-[11px] text-muted-foreground">13.1% CTR engagement</span>
        </Card>

        <Card className="bg-card border-border rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Enquiries Generated
          </span>
          <p className="text-2xl font-black text-highlight">112</p>
          <span className="text-[11px] text-success font-semibold">↑ 14 new this week</span>
        </Card>

        <Card className="bg-card border-border rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Buyer Conversion
          </span>
          <p className="text-2xl font-black text-success">4.8%</p>
          <span className="text-[11px] text-muted-foreground">Industry benchmark: 2.5%</span>
        </Card>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Traffic Chart */}
        <Card className="bg-card border-border rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Weekly Social Feed Impressions</h2>
            <Badge variant="secondary" className="text-xs font-semibold text-info">
              14,820 Total
            </Badge>
          </div>

          <div className="pt-4 flex items-end justify-between h-48 gap-2">
            {weeklyTrends.map((w) => {
              const heightPercent = Math.round((w.views / 3000) * 100);
              return (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-muted rounded-t-lg h-36 flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-primary rounded-t-lg transition-all hover:bg-info"
                      title={`${w.views} views, ${w.leads} leads`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">{w.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Regional Buyer Geographic Breakdown */}
        <Card className="bg-card border-border rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Buyer Engagement by Regional Hub</h2>
            <span className="text-xs text-muted-foreground">Western India Hubs</span>
          </div>

          <div className="space-y-3 pt-2">
            {cityMetrics.map((c) => (
              <div key={c.city} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    {c.city}
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    {c.leads} enquiries ({c.percentage})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    style={{ width: c.percentage }}
                    className="h-full bg-gradient-to-r from-primary to-info rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
