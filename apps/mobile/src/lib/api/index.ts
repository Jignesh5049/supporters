import { useSessionStore } from '../../stores/session-store';
import { secureTokenStore } from '../auth/token-storage';
import { queryClient } from '../query-client';
import { createAuthApi } from './auth';
import { createCatalogApi } from './catalog';
import { createMyBusinessApi } from './my-business';
import { createUploadsApi } from './uploads';
import { createApiClient } from './client';
import { API_URL, APP_VERSION } from './config';

export { ApiError, ApiErrorCode, messageForError } from './errors';
export { readLocalFile } from './uploads';

/** The one API client for the app. Screens use Query hooks or `authApi`, never `fetch`. */
export const apiClient = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  tokens: secureTokenStore,
  onSessionExpired: () => {
    queryClient.clear();
    useSessionStore.getState().setGuest();
  },
  onUpgradeRequired: () => useSessionStore.getState().setUpgradeRequired(),
});

export const authApi = createAuthApi(apiClient);
export const catalogApi = createCatalogApi(apiClient);
export const myBusinessApi = createMyBusinessApi(apiClient);
export const uploadsApi = createUploadsApi(apiClient);
