'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Clock,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export default function EditBusinessPage() {
  const router = useRouter();
  const { userBusiness, updateBusinessProfile, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'address' | 'operations'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(userBusiness?.name || '');
  const [category, setCategory] = useState(userBusiness?.category || '');
  const [businessType, setBusinessType] = useState(userBusiness?.businessType || 'Manufacturer');
  const [about, setAbout] = useState(userBusiness?.about || '');
  const [avatar, setAvatar] = useState(userBusiness?.avatar || '');
  const [coverImage, setCoverImage] = useState(userBusiness?.coverImage || '');
  const [contactPerson, setContactPerson] = useState(userBusiness?.contactPerson || 'Jignesh Patel');
  const [phone, setPhone] = useState(userBusiness?.phone || '');
  const [email, setEmail] = useState(userBusiness?.email || '');

  // Social & Web
  const [instagram, setInstagram] = useState(userBusiness?.instagram || '@shree_electronics_in');
  const [website, setWebsite] = useState(userBusiness?.website || 'https://shree-electronics.in');
  const [facebook, setFacebook] = useState(userBusiness?.facebook || '');
  const [youtube, setYoutube] = useState(userBusiness?.youtube || '');

  // Address
  const [addressLine, setAddressLine] = useState(userBusiness?.addressLine || 'Plot 42, Phase II');
  const [area, setArea] = useState(userBusiness?.area || 'Naroda GIDC');
  const [city, setCity] = useState(userBusiness?.city || 'Ahmedabad');
  const [state, setState] = useState(userBusiness?.state || 'Gujarat');
  const [pinCode, setPinCode] = useState(userBusiness?.pinCode || '382330');
  const [country, setCountry] = useState(userBusiness?.country || 'India');
  const [mapUrl, setMapUrl] = useState(userBusiness?.mapUrl || 'https://maps.google.com/?q=Naroda+GIDC+Ahmedabad');

  // Operations
  const [openingHours, setOpeningHours] = useState(userBusiness?.openingHours || 'Mon - Sat: 9:00 AM - 8:00 PM');
  const [availabilityStatus, setAvailabilityStatus] = useState(userBusiness?.availabilityStatus || 'Ready for Bulk Orders');
  const [priceRange, setPriceRange] = useState(userBusiness?.priceRange || '₹₹ (Commercial Bulk)');

  const validateUrl = (url: string) => {
    if (!url.trim()) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Business name is required.');
      setActiveTab('basic');
      return;
    }

    if (website && !validateUrl(website)) {
      setErrorMessage('Please enter a valid website URL (e.g. https://yourbusiness.com).');
      setActiveTab('social');
      return;
    }

    if (facebook && !validateUrl(facebook)) {
      setErrorMessage('Please enter a valid Facebook URL.');
      setActiveTab('social');
      return;
    }

    setIsSaving(true);

    const fullAddress = `${addressLine}, ${area}, ${city}, ${state} - ${pinCode}`;

    setTimeout(() => {
      updateBusinessProfile({
        name: name.trim(),
        category: category.trim(),
        businessType: businessType,
        about: about.trim(),
        avatar: avatar.trim() || userBusiness?.avatar,
        coverImage: coverImage.trim() || userBusiness?.coverImage,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        instagram: instagram.trim(),
        website: website.trim(),
        facebook: facebook.trim(),
        youtube: youtube.trim(),
        addressLine: addressLine.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: country.trim(),
        fullAddress,
        mapUrl: mapUrl.trim(),
        openingHours: openingHours.trim(),
        availabilityStatus: availabilityStatus.trim(),
        priceRange: priceRange.trim(),
        profileCompletion: 95,
      });

      setIsSaving(false);
      showToast('Business profile updated successfully!', 'success');
      router.push('/business/manage');
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/business/manage"
            className="p-2 text-[#667085] hover:text-[#111111] hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[#111111]">Edit Business Profile</h1>
            <p className="text-xs text-[#667085]">
              Update your public business identity, contacts, address, and operating hours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userBusiness && (
            <Link
              href={`/business/${userBusiness.slug || userBusiness.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#111111] text-xs font-bold transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#667085]" />
              <span>Preview Profile</span>
            </Link>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
        {[
          { id: 'basic', label: 'Basic Info', icon: Building2 },
          { id: 'social', label: 'Social & Web', icon: Globe },
          { id: 'address', label: 'Address & Map', icon: MapPin },
          { id: 'operations', label: 'Operations', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#2E3192] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#111111] hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-6">
        {/* SECTION 1: BASIC INFO */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111111] pb-2 border-b border-gray-100 uppercase tracking-wider text-xs">
              Basic Business Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Business Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shree Electronics & Systems"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as typeof businessType)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                >
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Service Provider">Service Provider</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Industrial Electronics & Automation"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Jignesh Patel"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">Business Description / About</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                rows={3}
                placeholder="Describe your manufacturing capacity, products, and specialties..."
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Business Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.in"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Logo URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: SOCIAL & WEB */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111111] pb-2 border-b border-gray-100 uppercase tracking-wider text-xs">
              Social Links & Web Presence
            </h2>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">
                Instagram Username or URL
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourhandle or https://instagram.com/yourhandle"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
              <p className="text-[11px] text-[#667085] mt-1">
                This will appear as a clickable Instagram badge on your public business page.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">Website URL</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">Facebook Page (Optional)</label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/yourpage"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">YouTube Channel (Optional)</label>
              <input
                type="text"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@channel"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: ADDRESS */}
        {activeTab === 'address' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111111] pb-2 border-b border-gray-100 uppercase tracking-wider text-xs">
              Physical Location & Maps
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Address Line</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Plot/Shop number, Building name"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Area / Locality</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="GIDC, Industrial Area, Ring Road"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">
                Google Maps Location Link
              </label>
              <input
                type="text"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
              <p className="text-[11px] text-[#667085] mt-1">
                Used for the &ldquo;Get Directions&rdquo; button on your public storefront.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 4: OPERATIONS */}
        {activeTab === 'operations' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#111111] pb-2 border-b border-gray-100 uppercase tracking-wider text-xs">
              Operating Schedule & Availability
            </h2>

            <div>
              <label className="text-xs font-bold text-[#111111] block mb-1">Opening Hours</label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="e.g. Mon - Sat: 9:00 AM - 8:00 PM (Closed Sundays)"
                className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Availability Status</label>
                <input
                  type="text"
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  placeholder="e.g. Ready for Bulk Orders / Made to Order"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Price Range</label>
                <input
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="e.g. ₹₹ (Commercial Bulk)"
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Link
            href="/business/manage"
            className="px-4 py-2.5 text-xs font-bold text-[#667085] hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
