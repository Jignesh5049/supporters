import { useSessionStore } from '../../stores/session-store';
import { secureTokenStore } from '../auth/token-storage';
import { wipeEncryptedStorage } from '../storage/encrypted-storage';
import { queryClient } from '../query-client';
import { createAuthApi } from './auth';
import { createBusinessesApi } from './businesses';
import { createProductsApi } from './products';
import { createServicesApi } from './services';
import { createCategoriesApi } from './categories';
import { createPlacesApi } from './places';
import { createUploadsApi } from './uploads';
import { createPostsApi } from './posts';
import { createSocialApi } from './social';
import { createChatApi } from './chat';
import { createEnquiriesApi } from './enquiries';
import { createModerationApi } from './moderation';
import { createApiClient } from './client';
import { API_URL, APP_VERSION } from './config';

export { ApiError, ApiErrorCode, listingLimitMessage, messageForError } from './errors';
export type { BusinessesApi } from './businesses';
export type { ProductsApi, ListQuery, MyListingsInputQuery } from './products';
export type { ServicesApi } from './services';
export type { CategoriesApi, CategoriesResponse } from './categories';
export type { PlacesApi } from './places';
export type { UploadsApi } from './uploads';
export type { PostsApi, PageQuery, MyPostsQuery } from './posts';
export type { SocialApi, FeedQuery, CommentsQuery, SavesQuery } from './social';
export type { ChatApi, ConversationsQuery, MessagesQuery, SendMessageDraft } from './chat';
export type { EnquiriesApi, EnquiryDraft, BusinessEnquiriesQuery } from './enquiries';
export type { ModerationApi } from './moderation';

/** The one API client for the app. Screens use Query hooks or specific domain APIs, never raw fetch. */
export const apiClient = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  tokens: secureTokenStore,
  onSessionExpired: () => {
    void wipeEncryptedStorage();
    queryClient.clear();
    useSessionStore.getState().setGuest();
  },
  onUpgradeRequired: () => useSessionStore.getState().setUpgradeRequired(),
});

export const authApi = createAuthApi(apiClient);
export const businessesApi = createBusinessesApi(apiClient);
export const productsApi = createProductsApi(apiClient);
export const servicesApi = createServicesApi(apiClient);
export const categoriesApi = createCategoriesApi(apiClient);
export const uploadsApi = createUploadsApi(apiClient);
export const postsApi = createPostsApi(apiClient);
export const socialApi = createSocialApi(apiClient);
export const placesApi = createPlacesApi(apiClient);
export const chatApi = createChatApi(apiClient);
export const enquiriesApi = createEnquiriesApi(apiClient);
export const moderationApi = createModerationApi(apiClient);
