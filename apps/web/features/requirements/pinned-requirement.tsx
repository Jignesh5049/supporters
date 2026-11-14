'use client';

import { Button } from '@supporters/ui-web/components/button';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { RequirementCard } from './requirement-card';
import { requirementKeys, requirementsApi } from './requirements-api';

/**
 * The pinned "Buyer requirement" card at the top of a seller's feed: the
 * newest open requirement matched to their business. Nothing when there is none.
 */
export function PinnedRequirement() {
  const query = useQuery({
    queryKey: requirementKeys.pinned,
    queryFn: () => requirementsApi.matched(undefined, 1),
    staleTime: 60_000,
  });
  const requirement = query.data?.data[0];
  if (!requirement) return null;
  return (
    <RequirementCard
      requirement={requirement}
      isPinned
      actions={
        <Button asChild size="sm" variant={requirement.hasQuoted ? 'outline' : 'default'}>
          <Link href={`/requirements/${requirement.id}`}>
            {requirement.hasQuoted ? 'View' : 'View and quote'}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      }
    />
  );
}
