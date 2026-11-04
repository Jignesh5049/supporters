import { useState } from 'react';
import type { SaveTargetType, SavedItem } from '@supporters/shared';
import { useApp } from '../../../context/AppContext';
import { messageForError } from '../../../lib/api';
import { useRequireAuth } from '../use-require-auth';
import { useSaves } from './use-saves';
import { useToggleSave } from './use-save';

/** The id of the thing a saved item points at. */
export function savedTargetId(item: SavedItem): string {
  switch (item.type) {
    case 'post':
      return item.post.id;
    case 'product':
      return item.product.id;
    case 'service':
      return item.service.id;
    case 'business':
      return item.business.id;
  }
}

/**
 * Save state for a product, service or business page. The listing payloads do
 * not say whether the viewer saved them, so this reads the loaded saved list
 * and keeps an optimistic answer until the server's arrives.
 */
export function useSavedState(type: Exclude<SaveTargetType, 'post'>, id: string) {
  const { showToast } = useApp();
  const requireAuth = useRequireAuth();
  const saves = useSaves(type);
  const { mutate } = useToggleSave();
  const [override, setOverride] = useState<boolean | null>(null);

  const fromServer =
    saves.data?.pages.some((page) => page.data.some((item) => savedTargetId(item) === id)) ?? false;
  const isSaved = override ?? fromServer;

  const toggle = () =>
    requireAuth(() => {
      const next = !isSaved;
      setOverride(next);
      mutate(
        { type, id, isSaved: next },
        {
          onError: (error) => {
            setOverride(null);
            showToast(messageForError(error), 'error');
          },
        },
      );
    });

  return { isSaved, toggle };
}
