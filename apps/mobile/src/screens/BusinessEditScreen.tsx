import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MyBusiness } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { useApp } from '../context/AppContext';
import { messageForError, uploadsApi } from '../lib/api';
import {
  businessToForm,
  buildCreateBusinessInput,
  buildUpdateBusinessInput,
  emptyBusinessForm,
  type BusinessFormValues,
} from '../features/business/business-form';
import {
  hasNoBusiness,
  useCreateBusinessMutation,
  useMyBusiness,
  useUpdateBusinessMutation,
} from '../features/business/hooks';
import {
  EditBusinessAddressTab,
  EditBusinessBasicTab,
  EditBusinessOperationsTab,
  EditBusinessSocialTab,
} from '../features/hub/components';
import { pickCroppedImage } from '../features/hub/image-picker';

type TabKey = 'basic' | 'social' | 'address' | 'hours';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '1. Basic' },
  { key: 'social', label: '2. Social & Web' },
  { key: 'address', label: '3. Address' },
  { key: 'hours', label: '4. Operations' },
];

/** Creates the owner's business, or edits it when they already have one. */
export function BusinessEditScreen() {
  const { navigate } = useApp();
  const business = useMyBusiness();

  if (business.isPending) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (business.isError && !hasNoBusiness(business.error)) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-center">{messageForError(business.error)}</Text>
        <Button variant="outline" onPress={() => business.refetch()}>
          <Text>Try again</Text>
        </Button>
        <Button variant="ghost" onPress={() => navigate('business_hub')}>
          <Text>Back to the hub</Text>
        </Button>
      </SafeAreaView>
    );
  }
  return <BusinessForm business={business.data ?? null} />;
}

function BusinessForm({ business }: { business: MyBusiness | null }) {
  const { navigate, showToast } = useApp();
  const createBusiness = useCreateBusinessMutation();
  const updateBusiness = useUpdateBusinessMutation();
  const isCreating = business === null;

  const [values, setValues] = useState<BusinessFormValues>(
    business ? businessToForm(business) : emptyBusinessForm(),
  );
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [error, setError] = useState<string | null>(null);
  // A picked photo shows right away; its upload id goes into the form once it is ready.
  const [logoUri, setLogoUri] = useState<string | undefined>(business?.logo?.url);
  const [coverUri, setCoverUri] = useState<string | undefined>(business?.cover?.url);
  const [uploading, setUploading] = useState<{ logo: boolean; cover: boolean }>({
    logo: false,
    cover: false,
  });

  const change = (patch: Partial<BusinessFormValues>) => {
    setError(null);
    setValues((current) => ({ ...current, ...patch }));
  };

  const pickImage = async (kind: 'logo' | 'cover') => {
    const picked = await pickCroppedImage(kind === 'logo' ? [1, 1] : [16, 9]);
    if (!picked.ok) {
      showToast('Allow photo access in Settings to choose a picture.', 'error');
      return;
    }
    const image = picked.media[0];
    if (!image) return;
    setUploading((current) => ({ ...current, [kind]: true }));
    try {
      const upload = await uploadsApi.uploadFile(
        image.uri,
        image.contentType,
        kind === 'logo' ? 'avatar' : 'cover',
      );
      if (kind === 'logo') {
        setLogoUri(image.uri);
        change({ logoMediaId: upload.id });
      } else {
        setCoverUri(image.uri);
        change({ coverMediaId: upload.id });
      }
    } catch (uploadError) {
      showToast(messageForError(uploadError), 'error');
    } finally {
      setUploading((current) => ({ ...current, [kind]: false }));
    }
  };

  const isSaving = createBusiness.isPending || updateBusiness.isPending;
  const isBusy = isSaving || uploading.logo || uploading.cover;

  const handleSave = () => {
    const onError = (saveError: unknown) => setError(messageForError(saveError));
    if (isCreating) {
      const built = buildCreateBusinessInput(values);
      if (!built.ok) return setError(built.message);
      createBusiness.mutate(built.input, {
        onSuccess: () => {
          showToast('Your business is ready!', 'success');
          navigate('business_hub');
        },
        onError,
      });
    } else {
      const built = buildUpdateBusinessInput(values);
      if (!built.ok) return setError(built.message);
      updateBusiness.mutate(built.input, {
        onSuccess: () => {
          showToast('Business details updated successfully!', 'success');
          navigate('business_hub');
        },
        onError,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} className="bg-background">
        <View className="border-border flex-row items-center justify-between border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => navigate('business_hub')}
            accessibilityLabel="Go back"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="text-base font-bold">
            {isCreating ? 'Create your business' : 'Edit Business Profile'}
          </Text>
          <Button size="sm" disabled={isBusy} onPress={handleSave} accessibilityLabel="Save">
            <Text>{isSaving ? 'Saving' : isCreating ? 'Create' : 'Save'}</Text>
          </Button>
        </View>
      </SafeAreaView>

      <View className="bg-muted/40 border-border flex-row border-b">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              variant="ghost"
              className={
                isActive
                  ? 'border-primary bg-background flex-1 rounded-none border-b-2'
                  : 'flex-1 rounded-none border-b-2 border-transparent'
              }
              onPress={() => setActiveTab(tab.key)}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className={
                  isActive ? 'text-primary text-xs font-bold' : 'text-muted-foreground text-xs'
                }
              >
                {tab.label}
              </Text>
            </Button>
          );
        })}
      </View>

      {error ? (
        <Text className="text-destructive px-4 pt-3 text-sm" role="alert">
          {error}
        </Text>
      ) : null}

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {activeTab === 'basic' ? (
          <EditBusinessBasicTab
            values={values}
            onChange={change}
            coverUri={coverUri}
            logoUri={logoUri}
            isUploadingCover={uploading.cover}
            isUploadingLogo={uploading.logo}
            onPickCover={() => void pickImage('cover')}
            onPickLogo={() => void pickImage('logo')}
          />
        ) : null}
        {activeTab === 'social' ? (
          <EditBusinessSocialTab values={values} onChange={change} />
        ) : null}
        {activeTab === 'address' ? (
          <EditBusinessAddressTab values={values} onChange={change} />
        ) : null}
        {activeTab === 'hours' ? (
          <EditBusinessOperationsTab values={values} onChange={change} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
