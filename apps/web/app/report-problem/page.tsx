'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, CheckCircle2, Send, Paperclip } from 'lucide-react';

export default function ReportProblemPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [issueType, setIssueType] = useState('Technical Issue');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('aarav.mehta@enterpriseventures.in');
  const [submitted, setSubmitted] = useState(false);

  const issueOptions = [
    'Technical Issue',
    'Account Issue',
    'Payment Issue',
    'Business Issue',
    'Abuse / Spam',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    showToast(
      'Incident reported. Case ID #SUP-' + Math.floor(10000 + Math.random() * 90000),
      'success',
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#111111]">Report a Problem</h1>
            <p className="text-xs text-[#667085]">
              Our trust & security team investigates every report within 12 business hours.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#111111]">Report Submitted Successfully</h2>
            <p className="text-xs text-[#667085] max-w-md">
              Thank you for keeping Supporters safe and reliable. Our compliance team will review
              your report and notify you by email.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-5 py-2.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
            >
              Return to Homepage
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Category of Issue
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full p-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs text-[#111111] focus:outline-none focus:border-[#2E3192]"
              >
                {issueOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Contact Email for Updates
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Describe the Incident or Bug
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Include relevant links, supplier names, or steps to reproduce the issue..."
                className="w-full p-3 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192] resize-none"
                required
              />
            </div>

            <div className="p-3 rounded-xl border border-dashed border-[#E5E7EB] text-center text-xs text-[#667085] hover:bg-gray-50 cursor-pointer">
              <Paperclip className="w-4 h-4 mx-auto mb-1 text-[#667085]" />
              <span>Attach screenshots or quotation documents (Optional, Max 10MB)</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
