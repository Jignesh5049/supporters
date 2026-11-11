import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Web spec, Admin area: never indexed (the proxy also sends `X-Robots-Tag` and `no-store`). */
export const metadata: Metadata = {
  title: { template: '%s | Supporters admin', default: 'Supporters admin' },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">{children}</div>;
}
