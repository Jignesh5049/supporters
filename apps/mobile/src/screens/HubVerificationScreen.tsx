import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  FileCheck,
  ShieldAlert,
  Upload,
  type LucideIcon,
} from 'lucide-react-native';
import {
  VERIFICATION_LIMITS,
  type MyVerification,
  type VerificationMethod,
} from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { useApp } from '../context/AppContext';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { messageForError } from '../lib/api';
import {
  type KycFile,
  type VerificationDraft,
  kycFileProblem,
  verificationDraftProblem,
  verificationErrorMessage,
} from '../features/moderation/moderation';
import {
  pickKycFiles,
  useMyVerification,
  useSubmitVerification,
} from '../features/moderation/use-verification';

const METHODS: { value: VerificationMethod; label: string; hint: string; certificate: string }[] = [
  {
    value: 'gstin',
    label: 'GST registration',
    hint: 'GSTIN, e.g. 27AAPFU0939F1ZV',
    certificate: 'GST registration certificate',
  },
  {
    value: 'udyam',
    label: 'Udyam / MSME',
    hint: 'Udyam number, e.g. UDYAM-MH-01-0012345',
    certificate: 'Udyam registration certificate',
  },
];

/** Business Hub > Verification (product spec, Verification): status, then the request form. */
export function HubVerificationScreen() {
  // GSTIN and KYC documents: no screenshots, recordings or recents-screen preview.
  useScreenSecurity('hub-verification-screen');
  const router = useRouter();
  const verification = useMyVerification();

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
        <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Back">
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Text className="text-base font-semibold" accessibilityRole="header">
          Business verification
        </Text>
      </View>
      {verification.isPending ? (
        <ActivityIndicator className="mt-10" />
      ) : verification.isError ? (
        <View className="items-center gap-3 p-6">
          <Text className="text-center">{messageForError(verification.error)}</Text>
          <Button variant="outline" onPress={() => verification.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          <StatusBanner verification={verification.data} />
          {verification.data.status === 'none' || verification.data.status === 'rejected' ? (
            <RequestForm />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Banner({
  icon,
  title,
  body,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: 'success' | 'info' | 'warning';
}) {
  const color = { success: 'text-success', info: 'text-primary', warning: 'text-warning' }[tone];
  return (
    <View
      className="border-border bg-card flex-row gap-3 rounded-2xl border p-4"
      accessibilityRole="summary"
    >
      <Icon as={icon} size={22} className={color} />
      <View className="flex-1 gap-1">
        <Text className={cn('font-semibold', color)}>{title}</Text>
        <Text className="text-sm">{body}</Text>
      </View>
    </View>
  );
}

function StatusBanner({ verification }: { verification: MyVerification }) {
  const { status, request } = verification;
  if (status === 'verified') {
    return (
      <Banner
        icon={BadgeCheck}
        tone="success"
        title="Your business is verified"
        body="The Verified badge shows on your page and posts. Changing the business name or GSTIN removes it until you are verified again."
      />
    );
  }
  if (status === 'pending') {
    return (
      <Banner
        icon={Clock}
        tone="info"
        title="In review"
        body={`We check your documents within ${VERIFICATION_LIMITS.reviewWorkingDays} working days and will notify you.${request ? ` Sent with ${request.registrationNumber}.` : ''}`}
      />
    );
  }
  if (status === 'rejected' && request?.rejectionReason) {
    return (
      <Banner
        icon={ShieldAlert}
        tone="warning"
        title="Not approved"
        body={`${request.rejectionReason} Fix this and send a new request.`}
      />
    );
  }
  return (
    <Banner
      icon={BadgeCheck}
      tone="info"
      title="Get the Verified badge"
      body="Verification is free. Send one certificate and your photo ID. Files stay private: only our review team can open them. Only verified businesses can quote on buyer requirements."
    />
  );
}

function FilePicker({
  label,
  files,
  onPick,
}: {
  label: string;
  files: KycFile[];
  onPick: () => void;
}) {
  const isPicked = files.length > 0;
  return (
    <Pressable
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={
        isPicked ? `${label}: ${files.map((f) => f.name).join(', ')}. Change` : label
      }
      className={cn(
        'min-h-11 flex-row items-center gap-3 rounded-xl border border-dashed p-4',
        isPicked ? 'border-success' : 'border-border',
      )}
    >
      <Icon
        as={isPicked ? FileCheck : Upload}
        size={22}
        className={isPicked ? 'text-success' : 'text-primary'}
      />
      <View className="flex-1">
        <Text className="text-sm font-semibold">{label}</Text>
        <Text variant="muted" className="text-xs" numberOfLines={2}>
          {isPicked ? files.map((file) => file.name).join(', ') : 'PDF, JPEG or PNG, up to 10 MB'}
        </Text>
      </View>
    </Pressable>
  );
}

function RequestForm() {
  const { showToast } = useApp();
  const submit = useSubmitVerification();
  const [draft, setDraft] = useState<VerificationDraft>({
    method: 'gstin',
    registrationNumber: '',
    certificate: null,
    ownerIds: [],
  });
  const [problem, setProblem] = useState<string | null>(null);
  const method = METHODS.find((option) => option.value === draft.method) ?? METHODS[0];

  const pick = async (kind: 'certificate' | 'ownerIds') => {
    try {
      const files = await pickKycFiles(kind === 'ownerIds');
      if (files.length === 0) return;
      const bad = files.map(kycFileProblem).find(Boolean);
      if (bad) {
        showToast(bad, 'error');
        return;
      }
      setDraft((current) =>
        kind === 'certificate'
          ? { ...current, certificate: files[0] ?? null }
          : { ...current, ownerIds: files.slice(0, VERIFICATION_LIMITS.ownerIdFiles.max) },
      );
    } catch {
      showToast('Could not open your files', 'error');
    }
  };

  const handleSubmit = () => {
    const found = verificationDraftProblem(draft);
    setProblem(found);
    if (found) return;
    submit.mutate(draft, {
      onSuccess: () => showToast('Sent for review', 'success'),
    });
  };

  return (
    <View className="border-border bg-card gap-4 rounded-2xl border p-4">
      <Text className="font-semibold">Registration</Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {METHODS.map((option) => {
          const isSelected = option.value === draft.method;
          return (
            <Pressable
              key={option.value}
              onPress={() => setDraft({ ...draft, method: option.value })}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              className={cn(
                'min-h-11 flex-1 items-center justify-center rounded-xl border px-2',
                isSelected ? 'border-primary bg-primary/10' : 'border-border',
              )}
            >
              <Text className={cn('text-sm', isSelected && 'text-primary font-semibold')}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        value={draft.registrationNumber}
        onChangeText={(registrationNumber) => setDraft({ ...draft, registrationNumber })}
        placeholder={method?.hint}
        accessibilityLabel={draft.method === 'gstin' ? 'GSTIN' : 'Udyam number'}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <FilePicker
        label={method?.certificate ?? 'Certificate'}
        files={draft.certificate ? [draft.certificate] : []}
        onPick={() => void pick('certificate')}
      />
      <FilePicker
        label="Owner photo ID (front and back)"
        files={draft.ownerIds}
        onPick={() => void pick('ownerIds')}
      />
      {problem || submit.error ? (
        <Text className="text-destructive text-sm" accessibilityLiveRegion="polite">
          {problem ?? verificationErrorMessage(submit.error)}
        </Text>
      ) : null}
      <Button
        onPress={handleSubmit}
        disabled={submit.isPending}
        accessibilityLabel="Send for verification"
      >
        {submit.isPending ? <ActivityIndicator /> : <Text>Send for verification</Text>}
      </Button>
    </View>
  );
}
