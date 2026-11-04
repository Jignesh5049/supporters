import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { HeaderWithSession } from '@/components/layout/header-with-session';
import { ChatRealtimeWithSession } from '@/components/layout/chat-realtime-with-session';
import { QueryProvider } from '@/components/providers/query-provider';
import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { MobileCreateModal } from '@/components/layout/MobileCreateModal';
import { ToastContainer } from '@/components/common/Toast';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { EnquiryModal } from '@/components/common/EnquiryModal';

export const metadata: Metadata = {
  title: {
    template: '%s | Supporters',
    default: 'Supporters - Social Commerce & Business Discovery Platform',
  },
  description:
    'Supporters connects manufacturers, retailers, distributors, wholesalers, and service providers across India with modern social discovery and direct business networking.',
  keywords: [
    'Supporters',
    'B2B marketplace India',
    'social commerce',
    'business discovery',
    'Ahmedabad manufacturers',
    'Surat textile wholesale',
    'Indian suppliers',
  ],
  authors: [{ name: 'Supporters India' }],
  creator: 'Supporters Technologies India Pvt Ltd',
  openGraph: {
    title: 'Supporters - Social Commerce & Business Discovery Platform',
    description:
      'Connect with verified Indian manufacturers, suppliers, and service providers. Discover products inside social feeds and enquire directly.',
    url: 'https://supporters.in',
    siteName: 'Supporters',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full antialiased bg-[#F7F8FC]">
      <body className="min-h-full flex flex-col text-[#111111]">
        <QueryProvider>
          <AppProvider>
            <Suspense fallback={null}>
              <ChatRealtimeWithSession />
            </Suspense>
            <Suspense fallback={<div className="h-16 bg-white border-b border-[#E5E7EB]" />}>
              <HeaderWithSession />
            </Suspense>
            <div className="flex-1 flex flex-col">
              <Suspense fallback={null}>
                <AppShell>{children}</AppShell>
              </Suspense>
            </div>
            <Suspense fallback={null}>
              <MobileNavigation />
            </Suspense>
            <MobileCreateModal />
            <ToastContainer />
            <ConfirmationDialog />
            <EnquiryModal />
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
