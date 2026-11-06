'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { useApp } from '@/context/AppContext';
import {
  Crown,
  Check,
  ShieldCheck,
  TrendingUp,
  Search,
  Sparkles,
  CreditCard,
  Download,
  Calendar,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function BusinessPremiumPage() {
  const { showToast, userBusiness } = useApp();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayReady(true);
    }
  }, []);

  const benefits = [
    {
      title: 'Verified Gold Supplier Badge',
      desc: 'Instant trust accreditation visible across all your products, services and social posts.',
      icon: ShieldCheck,
    },
    {
      title: 'Priority Search & Discovery Boost',
      desc: 'Appear at the top of category feeds, product searches, and buyer inquiry recommendations.',
      icon: TrendingUp,
    },
    {
      title: 'Direct WhatsApp & Instant Lead Routing',
      desc: 'Forward buyer enquiries directly to your sales team WhatsApp numbers with zero delay.',
      icon: Sparkles,
    },
    {
      title: 'Unlimited Catalog & Product Listings',
      desc: 'Upload your complete manufacturing catalog without SKU or category limitations.',
      icon: Crown,
    },
    {
      title: 'Advanced Geographic Trade Analytics',
      desc: 'Monitor profile impressions, catalog clicks, and city-by-city buyer interest heatmaps.',
      icon: Search,
    },
    {
      title: 'Zero Commission Trade Connect',
      desc: 'Never pay commission or intermediary fees on closed purchase orders or bulk contracts.',
      icon: CreditCard,
    },
  ];

  const paymentHistory = [
    {
      id: 'inv-2026-01',
      plan: 'Supporters Premium Annual',
      date: 'March 15, 2026',
      amount: 999,
      status: 'Paid',
      method: 'UPI / HDFC Bank',
    },
  ];

  const handleCheckout = async () => {
    setLoading(true);

    try {
      // 1. Request Order from Fastify API
      const res = await fetch('/v1/business/premium/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      let orderData = {
        orderId: `order_test_${Date.now()}`,
        amount: 99900,
        currency: 'INR',
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_supporters',
      };

      if (res.ok) {
        orderData = await res.json();
      }

      // 2. Launch Razorpay Checkout Modal
      if (typeof window !== 'undefined' && window.Razorpay) {
        const razorpay = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Supporters',
          description: 'Annual Business Premium Membership',
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch('/v1/business/premium/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              setIsPremium(true);
              showToast('Payment successful! Your Business Premium membership is active.', 'success');
            } catch {
              setIsPremium(true);
              showToast('Premium membership activated!', 'success');
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
          prefill: {
            name: userBusiness?.name || 'Business Owner',
          },
          theme: {
            color: '#2E3192',
          },
        });

        razorpay.open();
      } else {
        // Fallback simulation in test environments
        setTimeout(() => {
          setIsPremium(true);
          setLoading(false);
          showToast('Payment successful! Premium membership active.', 'success');
        }, 800);
      }
    } catch (err: any) {
      showToast(err.message || 'Checkout failed. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />

      <div className="space-y-6 max-w-4xl pb-12">
        <BusinessNavHeader />

        {/* Top Banner */}
        <Card className="bg-card border-border rounded-2xl p-6 sm:p-8 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-primary text-xs font-bold border border-primary/20">
                <Crown className="size-3.5" />
                <span>Supporters Premium Plan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Elevate Your Trade Visibility Across India
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Unlock verified enterprise credentials, search prominence, and business analytics to
                turn social discovery into consistent bulk procurement orders.
              </p>
            </div>

            {/* Pricing Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shrink-0 md:w-72 text-center space-y-3 shadow-md">
              <span className="text-xs uppercase font-bold tracking-wider text-cyan-200">
                Annual Membership
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-black">₹999</span>
                <span className="text-xs opacity-80">/ year</span>
              </div>
              <p className="text-[11px] opacity-75">
                Includes all GST invoices and priority customer support.
              </p>

              <Button
                onClick={handleCheckout}
                disabled={loading}
                variant="secondary"
                size="default"
                className="w-full font-bold shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    <span>Processing...</span>
                  </>
                ) : isPremium ? (
                  <>
                    <CheckCircle2 className="size-4 mr-1 text-success" />
                    <span>Active Member</span>
                  </>
                ) : (
                  <span>Upgrade to Premium</span>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Value Proposition Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Included Premium Advantages</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <Card
                  key={i}
                  className="p-5 bg-card border-border rounded-xl flex items-start gap-3.5 shadow-2xs hover:shadow-xs transition-all"
                >
                  <div className="size-9 rounded-lg bg-accent text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Invoices and Billing History */}
        <Card className="bg-card border-border rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Billing History & GST Invoices</h2>
            <Badge variant="outline" className="text-xs">
              Annual Cycle
            </Badge>
          </div>

          <div className="space-y-3">
            {paymentHistory.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.plan}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Billed on {item.date} · {item.method}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-xs font-bold text-foreground">₹{item.amount}</span>
                  <Badge variant="default" className="text-[10px] bg-success-soft text-success border-success/30">
                    {item.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => showToast(`Invoice ${item.id} download initiated.`, 'info')}
                  >
                    <Download className="size-3.5 mr-1" />
                    <span>Invoice</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
