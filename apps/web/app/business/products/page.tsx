'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { BusinessNavHeader } from '@/app/business/manage/page';
import { Package, Plus, Trash2, Edit3, ExternalLink } from 'lucide-react';

export default function BusinessProductsPage() {
  const { products, openConfirmationModal, showToast } = useApp();
  const myProducts = products.filter((p) => p.businessId === 'b-1');

  const handleDelete = (id: string, title: string) => {
    openConfirmationModal({
      title: 'Remove Product from Catalog',
      message: `Are you sure you want to delete "${title}"? This will remove the listing from Supporters search and social feeds.`,
      confirmLabel: 'Delete Product',
      isDestructive: true,
      onConfirm: () => {
        showToast(`Product "${title}" removed from catalog.`, 'info');
      },
    });
  };

  return (
    <div className="space-y-6">
      <BusinessNavHeader />

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-base font-bold text-[#111111]">Product Catalog Management</h2>
            <p className="text-xs text-[#667085]">
              Manage wholesale units, pricing, inventory stock and specifications
            </p>
          </div>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#667085] uppercase tracking-wider font-semibold">
                <th className="pb-3">Product</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">MOQ</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]/70">
              {myProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#F7F8FC] transition-colors">
                  <td className="py-3.5 font-bold text-[#111111]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden relative bg-gray-100 shrink-0 border border-[#E5E7EB]">
                        <Image
                          src={p.images[0]}
                          alt={p.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="line-clamp-1 max-w-xs">{p.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-[#667085]">{p.category}</td>
                  <td className="py-3.5 font-extrabold text-[#2E3192]">
                    ₹{p.price.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 text-[#111111]">
                    {p.minOrderQuantity} {p.unit}
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {p.availability}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/product/${p.id}`}
                        className="p-1.5 text-[#667085] hover:text-[#2E3192] hover:bg-gray-100 rounded-lg"
                        title="View Public Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        title="Delete Product"
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
