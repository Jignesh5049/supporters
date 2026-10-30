'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { useApp } from '@/context/AppContext';
import { FileQuestion, MessageSquare, Phone, CheckCircle2, Clock, Filter } from 'lucide-react';

export default function BusinessEnquiriesPage() {
  const { showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Quoted'>('All');

  const enquiries = [
    {
      id: 'enq-101',
      buyerName: 'Grand Palace Hotel & Resort',
      city: 'Surat, Gujarat',
      productName: 'Smart LED TV 55-Inch 4K UHD',
      quantity: '25 Units',
      phone: '+91 98251 09421',
      time: '2 hours ago',
      notes: 'Need delivery within 7 days at our Piplod Surat site with GST invoice.',
      status: 'Pending'
    },
    {
      id: 'enq-102',
      buyerName: 'TechVista Innovations Pvt Ltd',
      city: 'Ahmedabad, Gujarat',
      productName: 'Interactive Digital Touch Display 75-inch',
      quantity: '10 Units',
      phone: '+91 97240 88123',
      time: 'Yesterday 4:30 PM',
      notes: 'Required for corporate meeting rooms. Wall-mount bracket required.',
      status: 'Quoted'
    },
    {
      id: 'enq-103',
      buyerName: 'Ambika Electricals Wholesale',
      city: 'Rajkot, Gujarat',
      productName: 'Smart LED TV 55-Inch 4K UHD',
      quantity: '50 Units',
      phone: '+91 94270 19382',
      time: '3 days ago',
      notes: 'Looking for distributor bulk pricing for Saurashtra territory retail supply.',
      status: 'Quoted'
    }
  ];

  const filtered = enquiries.filter(
    (e) => filterStatus === 'All' || e.status === filterStatus
  );

  return (
    <div className="space-y-6">
      <BusinessNavHeader />

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Received Trade RFQ Inquiries</h2>
            <p className="text-xs text-[#667085]">Direct inquiries generated through your Supporters catalog & feed posts</p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(['All', 'Pending', 'Quoted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  filterStatus === s
                    ? 'bg-[#2E3192] text-white'
                    : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((enq) => (
            <div
              key={enq.id}
              className="p-4 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#00AEEF]/50 transition-all space-y-3 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111111]">{enq.buyerName}</h3>
                    <span className="text-[10px] text-[#667085]">· {enq.city}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#2E3192] mt-0.5">
                    Item: {enq.productName} ({enq.quantity})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      enq.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {enq.status}
                  </span>
                  <span className="text-[11px] text-[#667085]">{enq.time}</span>
                </div>
              </div>

              <div className="p-3 bg-[#F7F8FC] rounded-lg text-xs text-[#667085]">
                <strong className="text-[#111111]">Buyer Specification:</strong> {enq.notes}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#667085]">Phone / WA: <strong className="text-[#111111]">{enq.phone}</strong></span>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${enq.phone}`}
                    className="flex items-center gap-1 px-3 py-1.5 border border-[#E5E7EB] hover:bg-gray-50 rounded-lg text-[#111111] font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call Buyer</span>
                  </a>
                  <Link
                    href="/messages"
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#2E3192] hover:bg-[#242775] text-white font-semibold rounded-lg shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
