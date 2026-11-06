'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useLogout } from '@/features/auth/auth-api';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import {
  User,
  Shield,
  Bell,
  Sliders,
  Eye,
  Building,
  Crown,
  HelpCircle,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  Check,
  Smartphone,
  Lock,
  Globe,
  KeyRound,
  Download,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const logout = useLogout();
  const { openConfirmationModal, showToast, userBusiness, updateBusinessProfile } = useApp();

  const [activeSection, setActiveSection] = useState<
    'account' | 'preferences' | 'privacy' | 'security' | 'danger'
  >('account');

  // Form states
  const [name, setName] = useState('Jignesh Patel');
  const [email, setEmail] = useState('jignesh@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [bio, setBio] = useState('Founder & Industrial Manufacturer. Digital trade in India.');
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showPhoneOnCatalog, setShowPhoneOnCatalog] = useState(
    userBusiness?.showPhone ?? true,
  );
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  const handleToggleShowPhone = (val: boolean) => {
    setShowPhoneOnCatalog(val);
    updateBusinessProfile({ showPhone: val });
    showToast(
      val
        ? 'Phone number will now be shown on your catalog'
        : 'Phone number is now hidden from your catalog',
      'info',
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings saved successfully!', 'success');
  };

  const handleLogout = () => {
    openConfirmationModal({
      title: 'Sign Out',
      message: 'Are you sure you want to log out from this device?',
      confirmLabel: 'Sign Out',
      isDestructive: true,
      onConfirm: () => logout.mutate(),
    });
  };

  const handleDeleteAccount = () => {
    openConfirmationModal({
      title: 'Delete Account Permanently',
      message:
        'This will irreversibly erase your profile, catalog items, saved bookmarks and message logs. Are you certain?',
      confirmLabel: 'Delete Forever',
      isDestructive: true,
      onConfirm: () => {
        showToast('Account scheduled for deactivation', 'info');
        router.push('/login');
      },
    });
  };

  const sections = [
    { id: 'account', label: 'Account & Profile', icon: User },
    { id: 'preferences', label: 'Alerts & Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Visibility', icon: Eye },
    { id: 'security', label: 'Security & 2FA', icon: Lock },
    { id: 'danger', label: 'Data & Account', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile, notification preferences, privacy, and account security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}

          <div className="pt-4 border-t border-border space-y-1">
            <Link
              href="/business/premium"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-primary hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Crown className="size-4 text-primary" />
                <span>Premium Plan</span>
              </div>
              <ChevronRight className="size-3 text-muted-foreground" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive-soft transition-colors cursor-pointer text-left"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Form Panel */}
        <div className="md:col-span-3">
          {activeSection === 'account' && (
            <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">Account Information</h2>
                <p className="text-xs text-muted-foreground">Your primary contact and profile information.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sName" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="sName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sPhone" className="text-xs font-semibold">
                      Mobile Number (Verified)
                    </Label>
                    <Input
                      id="sPhone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled
                      className="opacity-70"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sEmail" className="text-xs font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="sEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sBio" className="text-xs font-semibold">
                    Bio / About
                  </Label>
                  <Textarea
                    id="sBio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" className="shadow-xs">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeSection === 'preferences' && (
            <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">Alerts & Notifications</h2>
                <p className="text-xs text-muted-foreground">Control how and when you receive buyer enquiry updates.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">WhatsApp Instant Alerts</p>
                    <p className="text-[11px] text-muted-foreground">Receive new lead notifications immediately on WhatsApp.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappAlerts}
                    onChange={(e) => setWhatsappAlerts(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Push Notifications</p>
                    <p className="text-[11px] text-muted-foreground">Browser web push alerts for new messages and quotes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushAlerts}
                    onChange={(e) => setPushAlerts(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Email Summary & Invoices</p>
                    <p className="text-[11px] text-muted-foreground">Weekly analytics digest and billing receipts.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'privacy' && (
            <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">Privacy & Visibility</h2>
                <p className="text-xs text-muted-foreground">Manage your contact disclosure and search indexation preferences.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Show Phone on Storefront</p>
                    <p className="text-[11px] text-muted-foreground">Allow prospective wholesale buyers to view and call directly.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showPhoneOnCatalog}
                    onChange={(e) => handleToggleShowPhone(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Search Engine Indexing</p>
                    <p className="text-[11px] text-muted-foreground">Allow your business listing to be discovered on Google and Bing.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Enabled for Listings
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">Security & Passwords</h2>
                <p className="text-xs text-muted-foreground">Manage session security and two-factor authentication.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-border rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" />
                    <h3 className="text-xs font-bold text-foreground">Two-Factor Authentication (TOTP)</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add an extra layer of protection using authenticator apps like Google Authenticator or 1Password.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => showToast('TOTP configuration initiated.', 'info')}>
                    Enable Authenticator App
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-info" />
                    <h3 className="text-xs font-bold text-foreground">Active Session Devices</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You are currently signed in from this browser. CloudFront security forwards verified HttpOnly tokens.
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive-soft" onClick={handleLogout}>
                    Sign Out All Other Sessions
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'danger' && (
            <Card className="p-6 bg-card border-border rounded-2xl shadow-xs space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">Data Export & Account Closure</h2>
                <p className="text-xs text-muted-foreground">Exercise GDPR / DPDP rights to export your trade history or delete your account.</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Download Account Data</p>
                    <p className="text-[11px] text-muted-foreground">Receive a complete ZIP archive of your listings, orders, and chats.</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => showToast('Data export requested. You will receive an email download link within 24 hours.', 'info')}>
                    <Download className="size-3.5" />
                    <span>Request Data Export</span>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-destructive/30 bg-destructive-soft rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-destructive">Permanently Delete Account</p>
                    <p className="text-[11px] text-muted-foreground">Irreversibly delete your profile, listings, and all trade records.</p>
                  </div>
                  <Button variant="destructive" size="sm" className="gap-1.5 text-xs shrink-0" onClick={handleDeleteAccount}>
                    <Trash2 className="size-3.5" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
