import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router, usePathname } from 'expo-router';
import {
  Product,
  Service,
  Business,
  NotificationItem,
  UserProfile,
  CURRENT_USER,
  MOCK_PRODUCTS,
  MOCK_SERVICES,
  MOCK_BUSINESSES,
  MOCK_NOTIFICATIONS,
} from '../../mock';
import {
  authService,
  SignInCredentials,
  SignUpData,
  AuthResult,
  OtpPurposeValue,
  ResetPasswordData,
} from '../services/authService';
import { z } from 'zod';
import type { ListingRef } from '@supporters/shared';
import { chatApi, messageForError } from '../lib/api';
import { restoreSession } from '../lib/auth/session';
import { queryClient } from '../lib/query-client';
import { chatKeys } from '../features/messages/query-keys';
import { TAB_ROUTES, hrefForRoute, routeForPath } from '../lib/navigation/routes';
import { SessionStatus, useSessionStore } from '../stores/session-store';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface EnquiryTarget {
  isOpen: boolean;
  targetTitle?: string;
  targetBusinessName?: string;
  targetBusinessId?: string;
  /** The product or service the form is about; without it the buyer picks one. */
  targetListing?: ListingRef;
}

export interface EnquiryRequest {
  title: string;
  businessName: string;
  businessId?: string;
  listing?: ListingRef;
}

export interface ShareTarget {
  isOpen: boolean;
  title: string;
  url: string;
}

export type ScreenRoute =
  | 'home'
  | 'discover'
  | 'messages'
  | 'chat'
  | 'profile'
  | 'create'
  | 'notifications'
  | 'saved'
  | 'referral'
  | 'subscription'
  | 'settings'
  | 'business_detail'
  | 'product_detail'
  | 'service_detail'
  | 'wallet'
  | 'withdrawal'
  | 'withdrawal_history'
  | 'business_hub'
  | 'business_edit'
  | 'business_posts'
  | 'business_settings'
  | 'sign_in'
  | 'sign_up'
  | 'verify_otp'
  | 'forgot_password';

interface AppContextType {
  // Navigation
  currentRoute: ScreenRoute;
  routeHistory: ScreenRoute[];
  navigate: (route: ScreenRoute, params?: any) => void;
  goBack: () => boolean;
  routeParams: any;

  // Authentication
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>;
  signUp: (data: SignUpData) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestOtp: (purpose: OtpPurposeValue, phone: string) => Promise<AuthResult>;
  resetPassword: (data: ResetPasswordData) => Promise<AuthResult>;

  // Drawer & Header
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  isHeaderVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;

  // User
  currentUser: UserProfile;
  updateUserProfile: (data: Partial<UserProfile>) => void;

  // Products
  products: Product[];
  savedProductIds: string[];
  toggleSaveProduct: (productId: string) => void;

  // Services
  services: Service[];
  savedServiceIds: string[];
  toggleSaveService: (serviceId: string) => void;

  // Businesses
  businesses: Business[];
  savedBusinessIds: string[];
  toggleSaveBusiness: (businessId: string) => void;
  followedBusinessIds: string[];
  toggleFollowBusiness: (businessId: string) => void;

  // Messaging
  /** Opens (or starts) the thread with a business: POST /v1/conversations. */
  openConversationWithBusiness: (businessId: string) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;

  // Modals
  enquiryModal: EnquiryTarget;
  openEnquiryModal: (info: EnquiryRequest) => void;
  closeEnquiryModal: () => void;

  shareModal: ShareTarget;
  openShareModal: (info: { title: string; url: string }) => void;
  closeShareModal: () => void;

  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;

  // Toast
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AUTH_ROUTES: ScreenRoute[] = ['sign_in', 'sign_up', 'verify_otp', 'forgot_password'];

/** Screens a guest (no session) can browse; the rest ask them to sign in. */
const GUEST_ROUTES: ScreenRoute[] = ['home', 'discover', 'business_detail', 'product_detail'];

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Navigation: Expo Router owns the stack. The prototype screen names map to paths.
  const pathname = usePathname();
  const [lastRoute, setLastRoute] = useState<ScreenRoute>('home');
  const [routeHistory, setRouteHistory] = useState<ScreenRoute[]>([]);
  const [routeParams, setRouteParams] = useState<any>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentRoute = routeForPath(pathname) ?? lastRoute;

  // Authentication state lives in the session store; tokens stay in SecureStore.
  const sessionStatus = useSessionStore((state) => state.status);
  const sessionUser = useSessionStore((state) => state.user);
  const isAuthenticated = sessionStatus === SessionStatus.SignedIn;
  const isLoadingAuth = sessionStatus === SessionStatus.Restoring;

  // Data states
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const [savedProductIds, setSavedProductIds] = useState<string[]>(['p-1', 'p-2']);
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>(['s-1']);
  const [savedBusinessIds, setSavedBusinessIds] = useState<string[]>(['b-1', 'b-2']);
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>(['b-2']);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isHeaderVisible, setHeaderVisible] = useState(true);
  const [enquiryModal, setEnquiryModal] = useState<EnquiryTarget>({ isOpen: false });
  const [shareModal, setShareModal] = useState<ShareTarget>({ isOpen: false, title: '', url: '' });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToast({ id, message, type });
      setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 3500);
    },
    [],
  );

  // Cold start: silent refresh with a stored session, otherwise guest mode.
  useEffect(() => {
    restoreSession();
  }, []);

  // Profile fields still come from mock data until the profile API lands.
  useEffect(() => {
    if (!sessionUser) return;
    setCurrentUser((prev) => ({
      ...prev,
      name: sessionUser.name,
      email: sessionUser.email ?? '',
      phone: sessionUser.phone,
    }));
  }, [sessionUser]);

  // Signed out (or the session expired) while on a protected screen: back to browsing.
  useEffect(() => {
    if (sessionStatus !== SessionStatus.Guest) return;
    if (AUTH_ROUTES.includes(currentRoute) || GUEST_ROUTES.includes(currentRoute)) return;
    setRouteHistory([]);
    setLastRoute('home');
    router.replace('/');
    // Only a session change should trigger this, not every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // Guarded Navigation
  const navigate = useCallback(
    (targetRoute: ScreenRoute, params: any = {}) => {
      const isAuthTarget = AUTH_ROUTES.includes(targetRoute);
      let route = targetRoute;

      if (!isAuthenticated && !isAuthTarget && !GUEST_ROUTES.includes(targetRoute)) {
        // Guests browse freely; anything personal asks them to sign in first.
        showToast('Sign in to continue', 'info');
        route = 'sign_in';
        params = {};
      } else if (isAuthenticated && isAuthTarget) {
        route = 'home';
        params = {};
      }

      if (route !== currentRoute) {
        setRouteHistory((prev) => [...prev, currentRoute]);
      }
      setLastRoute(route);
      setRouteParams(params);
      setDrawerOpen(false);

      const href = hrefForRoute(route, params);
      if (!href || href === pathname) return;
      // Tabs switch in place; every other screen stacks so back returns here.
      if (TAB_ROUTES.includes(route)) router.navigate(href);
      else router.push(href);
    },
    [isAuthenticated, currentRoute, pathname, showToast],
  );

  // In-app back. The hardware back button is handled by the router itself.
  const goBack = useCallback((): boolean => {
    setRouteHistory((prev) => prev.slice(0, -1));
    if (router.canGoBack()) {
      router.back();
      return true;
    }
    if (pathname !== '/') {
      router.replace('/');
      return true;
    }
    return false;
  }, [pathname]);

  // Authentication Handlers
  const enterApp = () => {
    setRouteHistory([]);
    setRouteParams({});
    setLastRoute('home');
    router.replace('/');
  };

  const signIn = async (credentials: SignInCredentials): Promise<AuthResult> => {
    const result = await authService.signIn(credentials);
    if (result.success) enterApp();
    return result;
  };

  const signUp = async (data: SignUpData): Promise<AuthResult> => {
    const result = await authService.signUp(data);
    if (result.success) enterApp();
    return result;
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
    setDrawerOpen(false);
    enterApp();
    showToast('Signed out of Supporters', 'info');
  };

  const requestOtp = (purpose: OtpPurposeValue, phone: string) =>
    authService.requestOtp(purpose, phone);

  const resetPassword = (data: ResetPasswordData) => authService.resetPassword(data);

  const toggleSaveProduct = (productId: string) => {
    setSavedProductIds((prev) => {
      const isSaved = prev.includes(productId);
      const next = isSaved ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast(
        isSaved ? 'Removed from saved products' : 'Product saved to your collection',
        'success',
      );
      return next;
    });
  };

  const toggleSaveService = (serviceId: string) => {
    setSavedServiceIds((prev) => {
      const isSaved = prev.includes(serviceId);
      const next = isSaved ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      showToast(
        isSaved ? 'Removed from saved services' : 'Service saved to your collection',
        'success',
      );
      return next;
    });
  };

  const toggleSaveBusiness = (businessId: string) => {
    setSavedBusinessIds((prev) => {
      const isSaved = prev.includes(businessId);
      const next = isSaved ? prev.filter((id) => id !== businessId) : [...prev, businessId];
      showToast(
        isSaved ? 'Removed from saved businesses' : 'Business saved to your collection',
        'success',
      );
      return next;
    });
  };

  const toggleFollowBusiness = (businessId: string) => {
    setFollowedBusinessIds((prev) => {
      const isFollowing = prev.includes(businessId);
      const next = isFollowing ? prev.filter((id) => id !== businessId) : [...prev, businessId];
      setBusinesses((current) =>
        current.map((b) => {
          if (b.id === businessId) {
            return {
              ...b,
              followersCount: isFollowing ? b.followersCount - 1 : b.followersCount + 1,
              isFollowed: !isFollowing,
            };
          }
          return b;
        }),
      );
      showToast(
        isFollowing ? 'Unfollowed business' : 'You are now following this business',
        'info',
      );
      return next;
    });
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...data }));
    showToast('Profile updated successfully!', 'success');
  };

  const openConversationWithBusiness = useCallback(
    (businessId: string) => {
      if (sessionStatus !== SessionStatus.SignedIn) {
        router.push('/sign-in');
        return;
      }
      if (!z.uuid().safeParse(businessId).success) {
        showToast("This business can't be messaged yet.", 'error');
        return;
      }
      chatApi.open(businessId).then(
        (conversation) => {
          queryClient.setQueryData(chatKeys.conversation(conversation.id), conversation);
          router.push(`/messages/${conversation.id}`);
        },
        (error: unknown) => showToast(messageForError(error), 'error'),
      );
    },
    [sessionStatus, showToast],
  );

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const openEnquiryModal = (info: EnquiryRequest) => {
    setEnquiryModal({
      isOpen: true,
      targetTitle: info.title,
      targetBusinessName: info.businessName,
      targetBusinessId: info.businessId,
      targetListing: info.listing,
    });
  };

  const closeEnquiryModal = () => {
    setEnquiryModal({ isOpen: false });
  };

  const openShareModal = (info: { title: string; url: string }) => {
    setShareModal({
      isOpen: true,
      title: info.title,
      url: info.url,
    });
  };

  const closeShareModal = () => {
    setShareModal({ isOpen: false, title: '', url: '' });
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigate,
        goBack,
        routeParams,
        isAuthenticated,
        isLoadingAuth,
        signIn,
        signUp,
        signOut,
        requestOtp,
        resetPassword,
        drawerOpen,
        setDrawerOpen,
        currentUser,
        updateUserProfile,
        products,
        savedProductIds,
        toggleSaveProduct,
        services,
        savedServiceIds,
        toggleSaveService,
        businesses,
        savedBusinessIds,
        toggleSaveBusiness,
        followedBusinessIds,
        toggleFollowBusiness,
        openConversationWithBusiness,
        routeHistory,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
        enquiryModal,
        openEnquiryModal,
        closeEnquiryModal,
        shareModal,
        openShareModal,
        closeShareModal,
        createModalOpen,
        setCreateModalOpen,
        isHeaderVisible,
        setHeaderVisible,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
