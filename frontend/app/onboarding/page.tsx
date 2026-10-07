'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { CURRENT_USER } from '@/lib/mock-data';
import { Camera, MapPin, ArrowRight, Check } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useApp();

  const [name, setName] = useState(CURRENT_USER.name);
  const [city, setCity] = useState('Ahmedabad, Gujarat');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Electronics',
    'Home',
    'Services'
  ]);

  const interestCategories = [
    'Electronics',
    'Fashion',
    'Food',
    'Home',
    'Agriculture',
    'Automotive',
    'Services',
    'Beauty',
    'Education',
    'Technology'
  ];

  const toggleInterest = (cat: string) => {
    setSelectedInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Your Supporters profile is now configured!', 'success');
    router.push('/');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00AEEF]">
            Step 2 of 2 · Profile Personalization
          </span>
          <h1 className="text-2xl font-black text-[#111111]">
            Welcome to the Supporters Network
          </h1>
          <p className="text-xs text-[#667085]">
            Tailor your business discovery feed to your industry vertical and commercial interests.
          </p>
        </div>

        <form onSubmit={handleFinish} className="space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative">
              <Avatar
                src={CURRENT_USER.avatar}
                name={name || 'You'}
                size="xl"
                className="ring-4 ring-blue-50"
              />
              <button
                type="button"
                onClick={() => showToast('Photo upload picker opened', 'info')}
                className="absolute bottom-0 right-0 p-2 bg-[#2E3192] text-white rounded-full shadow-sm hover:bg-[#242775] transition-colors"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[11px] text-[#667085]">Upload personal or business logo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Display Name / Firm Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Primary Business Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Interests Category Chips */}
          <div>
            <label className="block text-xs font-bold text-[#111111] mb-2">
              Select Your Trade Interests (Used to curate your feed)
            </label>
            <div className="flex flex-wrap gap-2">
              {interestCategories.map((cat) => {
                const isSelected = selectedInterests.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleInterest(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#2E3192] text-white shadow-2xs'
                        : 'bg-[#F7F8FC] border border-[#E5E7EB] text-[#667085] hover:text-[#111111]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                showToast('Welcome to Supporters!', 'info');
                router.push('/');
              }}
              className="text-xs font-semibold text-[#667085] hover:text-[#111111]"
            >
              Skip for now
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
            >
              <span>Complete Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
