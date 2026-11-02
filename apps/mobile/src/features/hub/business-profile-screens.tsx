import { router } from 'expo-router';
import { useState } from 'react';
import { CenteredMessage } from '../../components/centered-message';
import { useApp } from '../../context/AppContext';
import { messageForError } from '../../lib/api';
import { BusinessForm } from './business-form';
import {
  type BusinessFormValues,
  type FieldErrors,
  apiFieldErrors,
  businessToForm,
  emptyBusinessForm,
  toCreateBusinessInput,
  toUpdateBusinessInput,
} from './forms';
import { useCreateBusiness, useMyBusiness, useUpdateBusiness } from './queries';

/** `create-business`: onboarding with `POST /me/business`. */
export function CreateBusinessScreen() {
  const { showToast } = useApp();
  const existing = useMyBusiness();
  const create = useCreateBusiness();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (existing.data && !create.isSuccess) {
    return (
      <CenteredMessage
        title="You already have a business"
        description={`${existing.data.name} is set up. Manage it from the Business Hub.`}
        actionLabel="Open Business Hub"
        onAction={() => router.replace('/hub')}
      />
    );
  }

  const handleSubmit = (values: BusinessFormValues) => {
    setFormError(null);
    const result = toCreateBusinessInput(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.data, {
      onSuccess: () => {
        showToast('Your business is live on Supporters', 'success');
        router.replace('/hub');
      },
      onError: (error) => {
        setErrors(apiFieldErrors(error));
        setFormError(messageForError(error));
      },
    });
  };

  return (
    <BusinessForm
      title="Create your business"
      initialValues={emptyBusinessForm}
      submitLabel="Create business"
      isSaving={create.isPending}
      formError={formError}
      errors={errors}
      onSubmit={handleSubmit}
    />
  );
}

/** `hub/edit`: `PATCH /me/business`. */
export function EditBusinessScreen() {
  const { showToast } = useApp();
  const business = useMyBusiness().data;
  const update = useUpdateBusiness();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // hub/_layout only renders this once the business has loaded.
  if (!business) return null;

  const handleSubmit = (values: BusinessFormValues) => {
    setFormError(null);
    const result = toUpdateBusinessInput(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    update.mutate(result.data, {
      onSuccess: () => {
        showToast('Business details saved', 'success');
        router.back();
      },
      onError: (error) => {
        setErrors(apiFieldErrors(error));
        setFormError(messageForError(error));
      },
    });
  };

  return (
    <BusinessForm
      title="Edit business"
      initialValues={businessToForm(business)}
      submitLabel="Save changes"
      isSaving={update.isPending}
      formError={formError}
      errors={errors}
      onSubmit={handleSubmit}
    />
  );
}
