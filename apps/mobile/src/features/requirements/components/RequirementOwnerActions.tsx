import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { Requirement } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useApp } from '../../../context/AppContext';
import { messageForError } from '../../../lib/api';
import { useSetRequirementStatus } from '../hooks';

/** The buyer's buttons: view quotes, mark fulfilled, close (with a confirm). */
export function RequirementOwnerActions({
  requirement,
  showView = true,
}: {
  requirement: Requirement;
  /** False on the detail screen itself. */
  showView?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useApp();
  const change = useSetRequirementStatus();
  const setStatus = (status: 'closed' | 'fulfilled') =>
    change.mutate(
      { id: requirement.id, status },
      {
        onSuccess: () =>
          showToast(
            status === 'fulfilled' ? 'Marked as fulfilled' : 'Requirement closed',
            'success',
          ),
        onError: (error) => showToast(messageForError(error), 'error'),
      },
    );

  return (
    <>
      {showView ? (
        <Button
          size="sm"
          variant="outline"
          onPress={() => router.push(`/requirements/${requirement.id}`)}
        >
          <Text>
            {requirement.quoteCount > 0 ? `View ${requirement.quoteCount} quotes` : 'View'}
          </Text>
        </Button>
      ) : null}
      {requirement.status === 'open' ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={change.isPending}
            onPress={() => setStatus('fulfilled')}
          >
            <Text>Mark fulfilled</Text>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={change.isPending}
            onPress={() =>
              Alert.alert(
                'Close this requirement?',
                'Suppliers will stop seeing it and can no longer quote.',
                [
                  { text: 'Keep it open', style: 'cancel' },
                  { text: 'Close', style: 'destructive', onPress: () => setStatus('closed') },
                ],
              )
            }
          >
            <Text>Close</Text>
          </Button>
        </>
      ) : null}
    </>
  );
}
