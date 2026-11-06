'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X, Send, Building2, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function EnquiryModal() {
  const { enquiryState, closeEnquiryModal, showToast } = useApp();
  const [quantity, setQuantity] = useState('10');
  const [city, setCity] = useState('Ahmedabad');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('+91 98795 23410');
  const [submitted, setSubmitted] = useState(false);

  if (!enquiryState.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast(
      `Enquiry successfully sent to ${enquiryState.targetBusinessName || 'Supplier'}!`,
      'success',
    );
  };

  const handleClose = () => {
    setSubmitted(false);
    closeEnquiryModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-border shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-background">
          <div>
            <h3 className="text-base font-bold text-foreground">Send Business Enquiry</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct connection to verified manufacturer / supplier
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-foreground">Enquiry Transmitted!</h4>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
              Your inquiry for <strong>{enquiryState.targetTitle}</strong> has been forwarded to{' '}
              <strong>{enquiryState.targetBusinessName}</strong>. You will receive quotation alerts
              in your messages tab.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href="/messages"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 text-center text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
              >
                Go to Messages
              </Link>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 text-center text-sm font-semibold text-foreground bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Target Item Banner */}
            <div className="p-3.5 rounded-xl bg-background border border-border">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Inquiring about
              </span>
              <p className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">
                {enquiryState.targetTitle || 'Selected Product/Service'}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 text-info" />
                <span>{enquiryState.targetBusinessName || 'Verified Supplier'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Quantity Required
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 10 Units / 500 Pieces"
                  className="w-full px-3.5 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Delivery Destination
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City / State"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Contact Phone / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 Phone number"
                className="w-full px-3.5 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Specification or Custom Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Mention any custom specifications, GST requirements, or delivery schedule..."
                className="w-full px-3.5 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit Enquiry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
