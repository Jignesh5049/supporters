import { redirect } from 'next/navigation';

/**
 * The subscription route moved to /business/premium because Premium belongs to a business.
 */
export default function SubscriptionRedirect() {
  redirect('/business/premium');
}
