import { Metadata } from 'next';
import { RequirementForm } from './requirement-form';

export const metadata: Metadata = {
  title: 'Post a Buyer Requirement | Supporters',
  description:
    'Post your wholesale or commercial procurement inquiry and receive verified quotes from manufacturers across India.',
};

export default function NewRequirementPage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Post a Procurement Requirement
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect with verified suppliers across India and receive direct wholesale proposals.
          </p>
        </div>

        <RequirementForm />
      </div>
    </main>
  );
}
