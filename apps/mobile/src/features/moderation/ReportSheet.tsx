import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { REPORT_LIMITS, REPORT_REASON_LABELS, type ReportReason } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { Textarea } from '@supporters/ui-native/components/textarea';
import { cn } from '@supporters/ui-native/lib/utils';
import { useApp } from '../../context/AppContext';
import { moderationApi } from '../../lib/api';
import { REPORT_TARGET_NOUNS, reportErrorMessage, useReportStore } from './moderation';

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

/**
 * The report sheet (product spec, Moderation): a reason, an optional note,
 * then a thank-you. Mounted once in the root layout; `useReportStore().open`
 * shows it for a post, comment, business or message.
 */
export function ReportSheet() {
  const target = useReportStore((state) => state.target);
  const close = useReportStore((state) => state.close);
  const { showToast } = useApp();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useMutation({
    mutationFn: () => {
      if (!target || !reason) throw new Error('Pick a reason');
      return moderationApi.report({
        targetType: target.type,
        targetId: target.id,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
    },
    onSuccess: () => {
      handleClose();
      showToast('Thanks. Our team will review it.', 'success');
    },
  });

  function handleClose() {
    setReason(null);
    setDetails('');
    report.reset();
    close();
  }

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        className="flex-1 bg-black/40"
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="bg-background gap-3 rounded-t-2xl p-4 pb-8">
          <Text className="text-base font-semibold" accessibilityRole="header">
            Report this {target ? REPORT_TARGET_NOUNS[target.type] : 'content'}
          </Text>
          <Text variant="muted" className="text-xs">
            Reports are private. The person you report isn&apos;t told who reported them.
          </Text>
          <View accessibilityRole="radiogroup" className="gap-2">
            {REASONS.map((value) => {
              const isSelected = reason === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setReason(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  className={cn(
                    'min-h-11 justify-center rounded-xl border px-3',
                    isSelected ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  <Text className={cn('text-sm', isSelected && 'text-primary font-semibold')}>
                    {REPORT_REASON_LABELS[value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Textarea
            value={details}
            onChangeText={setDetails}
            maxLength={REPORT_LIMITS.details.max}
            placeholder="Anything else? (optional)"
            accessibilityLabel="Anything else? (optional)"
          />
          {report.error ? (
            <Text className="text-destructive text-sm" accessibilityLiveRegion="polite">
              {reportErrorMessage(report.error)}
            </Text>
          ) : null}
          <Button
            disabled={!reason || report.isPending}
            onPress={() => report.mutate()}
            accessibilityLabel="Send report"
          >
            <Text>{report.isPending ? 'Sending...' : 'Send report'}</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
