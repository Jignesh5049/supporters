import React from 'react';
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@supporters/ui-native/patterns';

interface FeedEmptyStateProps {
  onClearSearch: () => void;
}

export function FeedEmptyState({ onClearSearch }: FeedEmptyStateProps) {
  return (
    <EmptyState
      icon={<Inbox size={36} color="#9CA3AF" />}
      title="No posts found"
      description="Try adjusting your search term to see more business updates."
      actionLabel="Clear Search"
      onAction={onClearSearch}
      className="my-8 mx-4"
    />
  );
}
