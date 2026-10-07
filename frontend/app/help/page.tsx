'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  ChevronDown,
  Mail,
  AlertTriangle,
  Building,
  CreditCard,
  MessageSquare,
  Package,
  Wrench,
  Shield
} from 'lucide-react';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  const faqs = [
    {
      id: 'faq-1',
      category: 'Business',
      question: 'How do I get my business profile verified on Supporters?',
      answer: 'To obtain the blue verified badge, submit your valid GSTIN certificate and business PAN from your Business Dashboard. Our verification team reviews documentation within 24 hours.'
    },
    {
      id: 'faq-2',
      category: 'Account',
      question: 'Can I operate both as a buyer and a manufacturer on Supporters?',
      answer: 'Yes! Every Supporters account has access to the social commerce feed for purchasing while allowing you to register a business profile to list products and receive enquiries.'
    },
    {
      id: 'faq-3',
      category: 'Subscription',
      question: 'What is included in the ₹999/year Supporters Premium plan?',
      answer: 'Supporters Premium includes verified supplier credentialing, top placement in regional category discovery, unlimited product catalogues, and direct WhatsApp enquiry routing with zero platform transaction commission.'
    },
    {
      id: 'faq-4',
      category: 'Messages',
      question: 'How do B2B quotation enquiries work?',
      answer: 'When a buyer clicks "Contact Supplier" or "Send Enquiry", you receive an instant message thread containing their required quantity, delivery location, and custom specifications.'
    },
    {
      id: 'faq-5',
      category: 'Payments',
      question: 'Does Supporters take commission on finished purchase orders?',
      answer: 'No! Supporters is a zero-commission social commerce and discovery network. Direct agreements, payments, and trade terms happen directly between buyers and suppliers.'
    },
    {
      id: 'faq-6',
      category: 'Products',
      question: 'How do I list minimum order quantities (MOQ)?',
      answer: 'When creating or editing a product, specify the minimum order quantity along with your preferred packaging unit (e.g. 10 Units, 500 Pieces, or 25kg Bags).'
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Search Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
            How can we help your business today?
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1 max-w-lg mx-auto">
            Search answers on supplier onboarding, verification, order enquiries, and partner rewards.
          </p>
        </div>

        <div className="max-w-xl mx-auto relative">
          <Search className="w-4 h-4 text-[#667085] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type your question (e.g. verification, MOQ, commission)..."
            className="w-full pl-11 pr-4 py-3 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
          />
        </div>
      </div>

      {/* FAQs Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-[#111111] pb-3 border-b border-[#E5E7EB]">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="border border-[#E5E7EB] rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-[#F7F8FC]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-[#2E3192] bg-blue-50 px-2 py-0.5 rounded">
                      {faq.category}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#111111]">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#667085] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#2E3192]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 bg-[#F7F8FC]/50 text-xs text-[#667085] leading-relaxed border-t border-[#E5E7EB]/60">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact & Report Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2E3192] flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Contact Supporters Helpdesk</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Our trade operations team is available Monday to Saturday (9 AM - 7 PM IST) for seller onboarding support.
          </p>
          <a
            href="mailto:support@supporters.in"
            className="inline-block text-xs font-bold text-[#2E3192] hover:underline pt-1"
          >
            support@supporters.in →
          </a>
        </div>

        <div className="p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Report a Problem or Abuse</h3>
          <p className="text-xs text-[#667085] leading-relaxed">
            Report fraudulent listings, copyright infringements, non-responsive suppliers, or platform bugs.
          </p>
          <Link
            href="/report-problem"
            className="inline-block text-xs font-bold text-rose-600 hover:underline pt-1"
          >
            Open Problem Report Form →
          </Link>
        </div>
      </div>
    </div>
  );
}
