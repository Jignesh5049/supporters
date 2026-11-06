'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { ProductCard } from '@/components/product/ProductCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import {
  MapPin,
  Calendar,
  Building,
  Users,
  Bookmark,
  Sparkles,
  FileQuestion,
  Star,
  Settings,
  Edit3,
  ExternalLink,
  Package,
  Wrench,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function ProfilePage() {
  const { posts, products, services, savedProductIds, userBusiness, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'posts' | 'business' | 'saved' | 'enquiries'>('posts');
  const [editModalOpen, setEditModalOpen] = useState(false);

  // User State
  const [name, setName] = useState('Jignesh Patel');
  const [bio, setBio] = useState('Founder & Industrial Manufacturer. Passionate about B2B supply chain growth and digital trade in India.');
  const [city, setCity] = useState('Surat, Gujarat');

  const myPosts = posts.filter((p) => userBusiness?.id && p.businessId === userBusiness.id);
  const myProducts = products.filter((p) => userBusiness?.id && p.businessId === userBusiness.id);
  const myServices = services.filter((s) => userBusiness?.id && s.businessId === userBusiness.id);
  const mySavedProducts = products.filter((p) => savedProductIds.includes(p.id));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalOpen(false);
    showToast('Profile information updated successfully!', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Profile Header Box */}
      <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-2xs">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-primary to-info">
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Profile Card Body */}
        <div className="p-6 sm:p-8 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <div className="relative">
              <Avatar
                name={name}
                size="xl"
                verified={userBusiness?.verified}
                className="ring-4 ring-card shadow-md"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Edit3 className="size-3.5" />
                <span>Edit Profile</span>
              </Button>
              <Button variant="ghost" size="sm" asChild className="size-9 p-0">
                <Link href="/settings" aria-label="Settings">
                  <Settings className="size-4 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">{name}</h1>
              {userBusiness?.verified && (
                <Badge variant="default" className="text-xs gap-1 bg-info text-white">
                  <CheckCircle2 className="size-3" />
                  <span>Verified Member</span>
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{bio}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                <span>{city}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-info" />
                <span>Joined January 2025</span>
              </span>
              {userBusiness && (
                <Link
                  href={`/business/${userBusiness.slug || userBusiness.id}`}
                  className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
                >
                  <Building className="size-3.5" />
                  <span>{userBusiness.name}</span>
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-t border-border overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Feed Posts ({myPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'business'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            My Business Storefront
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'saved'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Saved Products ({mySavedProducts.length})
          </button>
        </div>
      </Card>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {myPosts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No posts published yet"
                description="Share product highlights, wholesale updates, and announcements with buyers on Supporters."
                actionLabel="Create Post"
                actionHref="/create"
              />
            ) : (
              myPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
            )}
          </div>
        )}

        {activeTab === 'business' && (
          <div className="space-y-4">
            {userBusiness ? (
              <Card className="p-6 bg-card border-border rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-foreground">{userBusiness.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {userBusiness.city}, {userBusiness.state} · {userBusiness.businessType}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/business/manage">Manage Business</Link>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-muted rounded-xl text-center">
                    <Package className="size-4 text-primary mx-auto mb-1" />
                    <span className="text-base font-black text-foreground">{myProducts.length}</span>
                    <p className="text-[11px] text-muted-foreground">Catalog Products</p>
                  </div>
                  <div className="p-3 bg-muted rounded-xl text-center">
                    <Wrench className="size-4 text-info mx-auto mb-1" />
                    <span className="text-base font-black text-foreground">{myServices.length}</span>
                    <p className="text-[11px] text-muted-foreground">Services</p>
                  </div>
                  <div className="p-3 bg-muted rounded-xl text-center col-span-2 sm:col-span-1">
                    <Users className="size-4 text-highlight mx-auto mb-1" />
                    <span className="text-base font-black text-foreground">
                      {(userBusiness.followersCount || 0).toLocaleString()}
                    </span>
                    <p className="text-[11px] text-muted-foreground">Followers</p>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon={Building}
                title="No business profile linked"
                description="Register your manufacturing unit, export house, or wholesale dealership to start selling."
                actionLabel="Register Business"
                actionHref="/onboarding/business"
              />
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            {mySavedProducts.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved items yet"
                description="Click the bookmark icon on any product or service to save it to your wishlist for later reference."
                actionLabel="Explore Catalog"
                actionHref="/discover"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {mySavedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <Card className="bg-card border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground">Edit Profile Information</h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="profName" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="profName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profCity" className="text-xs font-semibold">
                  Location (City, State)
                </Label>
                <Input
                  id="profCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profBio" className="text-xs font-semibold">
                  Bio
                </Label>
                <Textarea
                  id="profBio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={250}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
