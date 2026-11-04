import React from 'react';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@supporters/ui-native/patterns';

interface FeedEmptyStateProps {
  isGuest: boolean;
  onAction: () => void;
}

export function FeedEmptyState({ isGuest, onAction }: FeedEmptyStateProps) {
  return (
    <EmptyState
      icon={<Inbox size={36} color="#9CA3AF" />}
      title="No posts yet"
      description={
        isGuest
          ? 'Sign in to follow businesses and see their updates here.'
          : 'Follow businesses on Discover to fill your feed with their updates.'
      }
      actionLabel={isGuest ? 'Sign in' : 'Discover businesses'}
      onAction={onAction}
      className="mx-4 my-8"
    />
  );
}
