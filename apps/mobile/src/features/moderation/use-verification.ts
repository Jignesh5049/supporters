import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MEDIA_LIMITS } from '@supporters/shared';
import { moderationApi, uploadsApi } from '../../lib/api';
import { businessKeys } from '../business/hooks/useBusinessQuery';
import { type KycFile, type VerificationDraft, submitVerification } from './moderation';

export const verificationKey = ['me', 'business', 'verification'] as const;

export function useMyVerification(enabled = true) {
  return useQuery({ queryKey: verificationKey, queryFn: moderationApi.getVerification, enabled });
}

/** PDFs, JPEGs or PNGs from the files app; an empty list means the user cancelled. */
export async function pickKycFiles(multiple: boolean): Promise<KycFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...MEDIA_LIMITS.documentTypes, ...MEDIA_LIMITS.kycImageTypes],
    copyToCacheDirectory: true,
    multiple,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    contentType: asset.mimeType ?? '',
    size: asset.size,
  }));
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: VerificationDraft) =>
      submitVerification(draft, { uploads: uploadsApi, submit: moderationApi.submitVerification }),
    onSuccess: (result) => {
      queryClient.setQueryData(verificationKey, result);
      // The business's own verificationStatus changed too.
      void queryClient.invalidateQueries({ queryKey: businessKeys.mine() });
    },
  });
}
