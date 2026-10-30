'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { Wrench, Plus, Trash2, ExternalLink } from 'lucide-react';

export default function BusinessServicesPage() {
  const { services, openConfirmationModal, showToast } = useApp();
  const myServices = services.filter((s) => s.businessId === 'b-6' || s.businessId === 'b-1');

  const handleDelete = (id: string, title: string) => {
    openConfirmationModal({
      title: 'Remove Service Offering',
      message: `Are you sure you want to remove "${title}" from your commercial service offerings?`,
      confirmLabel: 'Remove Service',
      isDestructive: true,
      onConfirm: () => {
        showToast(`Service "${title}" removed.`, 'info');
      },
    });
  };

  return (
    <div className="space-y-6">
      <BusinessNavHeader />

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Service Offerings Management</h2>
            <p className="text-xs text-[#667085]">
              Manage corporate solutions, turnkey contracts, and consulting packages
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#00AEEF] hover:bg-[#0098d4] rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Service</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#667085] uppercase tracking-wider font-semibold">
                <th className="pb-3">Service Scope</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Starting Rate</th>
                <th className="pb-3">Service Area</th>
                <th className="pb-3">Turnaround</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/70">
              {myServices.map((s) => (
                <tr key={s.id} className="hover:bg-[#F7F8FC] transition-colors">
                  <td className="py-3.5 font-bold text-[#111111]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-gray-100 shrink-0 border border-[#E5E7EB]">
                        <Image
                          src={s.images[0]}
                          alt={s.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="line-clamp-1 max-w-xs">{s.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#667085]">{s.category}</td>
                  <td className="py-3.5 font-extrabold text-[#2E3192]">
                    ₹{s.startingPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 text-[#667085] line-clamp-1 max-w-xs">{s.serviceArea}</td>
                  <td className="py-3.5 text-[#111111]">{s.turnaroundTime}</td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/service/${s.id}`}
                        className="p-1.5 text-[#667085] hover:text-[#00AEEF] hover:bg-gray-100 rounded-lg"
                        title="View Public Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id, s.title)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Delete Service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
