import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import {
  FeedPost,
  Product,
  Service,
  Business,
  Conversation,
  NotificationItem,
  UserProfile,
  PostType,
  CURRENT_USER,
  MOCK_POSTS,
  MOCK_PRODUCTS,
  MOCK_SERVICES,
  MOCK_BUSINESSES,
  MOCK_CONVERSATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_REFERRAL_DATA,
  ReferralStat,
  WalletSummary,
  WalletTransaction,
  WithdrawalRequest,
  MOCK_WALLET_DATA,
} from '../../mock';
import {
  authService,
  SignInCredentials,
  SignUpData,
  AuthResult,
  OtpPurposeValue,
  ResetPasswordData,
} from '../services/authService';
import { restoreSession } from '../lib/auth/session';
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

  // Posts
  posts: FeedPost[];
  addPost: (data: {
    postType: PostType;
    content: string;
    images?: string[];
    aspectRatio?: '16:9' | '9:16';
    attachedProduct?: FeedPost['attachedProduct'];
    attachedService?: FeedPost['attachedService'];
    offerTag?: string;
  }) => void;
  deletePost: (postId: string) => void;
  likedPostIds: string[];
  toggleLikePost: (postId: string) => void;
  savedPostIds: string[];
  toggleSavePost: (postId: string) => void;

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
  conversations: Conversation[];
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  sendMessage: (
    conversationId: string,
    text: string,
    attachedProduct?: any,
    attachedService?: any,
  ) => void;
  unreadMessagesCount: number;
  openConversationWithBusiness: (
    businessId: string,
    options?: {
      initialMessage?: string;
      attachedProduct?: any;
      attachedService?: any;
    },
  ) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;

  // Referral
  referralData: ReferralStat;

  // Wallet & Withdrawals
  walletData: WalletSummary;
  requestWithdrawal: (params: {
    amount: number;
    method: 'UPI' | 'Bank Account';
    upiId?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  }) => { success: boolean; message: string };

  // Business Management (Owner interface)
  userBusiness: Business | undefined;
  updateBusinessProfile: (data: Partial<Business>) => void;
  updateBusinessPost: (postId: string, data: Partial<FeedPost>) => void;
  setBusinessPostStatus: (postId: string, status: 'Published' | 'Draft' | 'Archived') => void;

  // Modals
  enquiryModal: EnquiryTarget;
  openEnquiryModal: (info: { title: string; businessName: string; businessId?: string }) => void;
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
  // Navigation & History
  const [currentRoute, setCurrentRoute] = useState<ScreenRoute>('home');
  const [routeHistory, setRouteHistory] = useState<ScreenRoute[]>([]);
  const [routeParams, setRouteParams] = useState<any>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Authentication state lives in the session store; tokens stay in SecureStore.
  const sessionStatus = useSessionStore((state) => state.status);
  const sessionUser = useSessionStore((state) => state.user);
  const isAuthenticated = sessionStatus === SessionStatus.SignedIn;
  const isLoadingAuth = sessionStatus === SessionStatus.Restoring;

  // Data states
  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1');
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [referralData] = useState<ReferralStat>(MOCK_REFERRAL_DATA);
  const [walletData, setWalletData] = useState<WalletSummary>(MOCK_WALLET_DATA);

  const [likedPostIds, setLikedPostIds] = useState<string[]>(['post-2']);
  const [savedPostIds, setSavedPostIds] = useState<string[]>(['post-2']);
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
    setCurrentRoute('home');
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
      setCurrentRoute(route);
      setRouteParams(params);
      setDrawerOpen(false);
    },
    [isAuthenticated, currentRoute, showToast],
  );

  // Hardware and In-App Back Navigation
  const goBack = useCallback((): boolean => {
    // Signed in: never step back into auth screens. Guest: never into protected ones.
    const canReturnTo = (route: ScreenRoute) =>
      isAuthenticated
        ? !AUTH_ROUTES.includes(route)
        : AUTH_ROUTES.includes(route) || GUEST_ROUTES.includes(route);
    const newHistory = [...routeHistory];
    let previous = newHistory.pop();
    while (previous && !canReturnTo(previous)) {
      previous = newHistory.pop();
    }
    if (previous) {
      setRouteHistory(newHistory);
      setCurrentRoute(previous);
      return true;
    }

    if (currentRoute !== 'home') {
      setCurrentRoute('home');
      setRouteHistory([]);
      return true;
    }

    // On home screen, let Android exit app
    return false;
  }, [isAuthenticated, currentRoute, routeHistory]);

  // Android Hardware Back Button listener
  useEffect(() => {
    const handleHardwareBackPress = () => {
      return goBack();
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBackPress,
    );

    return () => {
      backSubscription.remove();
    };
  }, [goBack]);

  // Authentication Handlers
  const enterApp = () => {
    setRouteHistory([]);
    setRouteParams({});
    setCurrentRoute('home');
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

  const toggleLikePost = (postId: string) => {
    setLikedPostIds((prev) => {
      const isLiked = prev.includes(postId);
      const next = isLiked ? prev.filter((id) => id !== postId) : [...prev, postId];
      setPosts((currentPosts) =>
        currentPosts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              likesCount: isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
              isLiked: !isLiked,
            };
          }
          return p;
        }),
      );
      if (!isLiked) {
        showToast('Post liked', 'info');
      }
      return next;
    });
  };

  const toggleSavePost = (postId: string) => {
    setSavedPostIds((prev) => {
      const isSaved = prev.includes(postId);
      const next = isSaved ? prev.filter((id) => id !== postId) : [...prev, postId];
      showToast(isSaved ? 'Removed from saved posts' : 'Post saved to your collection', 'success');
      return next;
    });
  };

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

  const addPost = (data: {
    postType: PostType;
    content: string;
    images?: string[];
    aspectRatio?: '16:9' | '9:16';
    attachedProduct?: FeedPost['attachedProduct'];
    attachedService?: FeedPost['attachedService'];
    offerTag?: string;
  }) => {
    const userBusiness = businesses.find((b) => b.id === currentUser.businessId);

    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      authorId: currentUser.email || 'user-me',
      isOwnPost: true,
      businessId: currentUser.businessId || 'b-user',
      businessName: currentUser.hasBusiness && userBusiness ? userBusiness.name : currentUser.name,
      businessAvatar: currentUser.avatar,
      businessVerified: userBusiness ? userBusiness.verified : false,
      location: currentUser.city || 'Ahmedabad',
      createdAt: 'Just now',
      postType: data.postType,
      content: data.content,
      images: data.images,
      aspectRatio: data.aspectRatio || '16:9',
      attachedProduct: data.attachedProduct,
      attachedService: data.attachedService,
      offerTag: data.offerTag,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      isSaved: false,
    };

    setPosts((prev) => [newPost, ...prev]);
    showToast('Your update has been published to Supporters feed!', 'success');
  };

  const deletePost = (postId: string) => {
    const postToDelete = posts.find((p) => p.id === postId);
    if (!postToDelete) return;

    const isOwn = Boolean(
      postToDelete.isOwnPost ||
      (postToDelete.authorId &&
        (postToDelete.authorId === currentUser.email ||
          postToDelete.authorId === 'user-me' ||
          postToDelete.authorId === currentUser.username)),
    );

    if (!isOwn) {
      showToast('You can only delete posts published by your own account', 'error');
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast('Your post has been deleted from the feed', 'info');
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...data }));
    showToast('Profile updated successfully!', 'success');
  };

  // Business Profile Management
  const userBusiness = businesses.find((b) => b.id === currentUser.businessId) || businesses[0];

  const updateBusinessProfile = (data: Partial<Business>) => {
    const targetId = currentUser.businessId || userBusiness?.id || 'b-1';
    setBusinesses((prev) => prev.map((b) => (b.id === targetId ? { ...b, ...data } : b)));
    showToast('Business details updated successfully!', 'success');
  };

  const updateBusinessPost = (postId: string, data: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
    showToast('Post updated successfully!', 'success');
  };

  const setBusinessPostStatus = (postId: string, status: 'Published' | 'Draft' | 'Archived') => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, postStatus: status } : p)));
    showToast(`Post status updated to ${status}`, 'info');
  };

  // Wallet & Withdrawal Management
  const requestWithdrawal = (params: {
    amount: number;
    method: 'UPI' | 'Bank Account';
    upiId?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  }): { success: boolean; message: string } => {
    if (params.amount <= 0) {
      return { success: false, message: 'Withdrawal amount must be greater than ₹0' };
    }
    if (params.amount > walletData.availableBalance) {
      return { success: false, message: 'Amount exceeds available wallet balance' };
    }
    if (params.amount < 100) {
      return { success: false, message: 'Minimum withdrawal amount is ₹100' };
    }

    const newReqId = `wd-${Date.now()}`;
    const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;

    const newWithdrawal: WithdrawalRequest = {
      id: newReqId,
      referenceId: refId,
      amount: params.amount,
      method: params.method,
      upiId: params.upiId,
      accountHolderName: params.accountHolderName,
      accountNumber: params.accountNumber,
      ifscCode: params.ifscCode,
      bankName: params.bankName,
      status: 'Pending',
      createdAt: 'Just now',
      estimatedDate: 'Within 24-48 business hours',
    };

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      referenceId: refId,
      title: `Withdrawal Request (${params.method})`,
      amount: -params.amount,
      type: 'withdrawal',
      status: 'Pending',
      createdAt: 'Just now',
      withdrawalMethod: params.method,
      payoutDetails:
        params.method === 'UPI'
          ? `UPI: ${params.upiId}`
          : `${params.bankName || 'Bank'} A/C: ••••${params.accountNumber?.slice(-4) || 'XXXX'}`,
      description: 'Payout requested to linked account. Under automated verification.',
    };

    setWalletData((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - params.amount,
      pendingWithdrawals: prev.pendingWithdrawals + params.amount,
      transactions: [newTx, ...prev.transactions],
      withdrawalRequests: [newWithdrawal, ...prev.withdrawalRequests],
    }));

    showToast(`Withdrawal of ₹${params.amount.toLocaleString('en-IN')} requested!`, 'success');
    return { success: true, message: 'Withdrawal request submitted successfully' };
  };

  const sendMessage = (
    conversationId: string,
    text: string,
    attachedProduct?: any,
    attachedService?: any,
  ) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'user-me',
      senderName: 'You',
      text,
      timestamp: 'Just now',
      isMe: true,
      attachedProduct,
      attachedService,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      }),
    );
    showToast('Message sent', 'info');
  };

  const openConversationWithBusiness = useCallback(
    (
      businessId: string,
      options?: {
        initialMessage?: string;
        attachedProduct?: any;
        attachedService?: any;
      },
    ) => {
      // Find if a conversation already exists with this businessId
      const existingConv = conversations.find((c) => c.businessId === businessId);

      if (existingConv) {
        setActiveConversationId(existingConv.id);
        if (options?.initialMessage) {
          sendMessage(
            existingConv.id,
            options.initialMessage,
            options.attachedProduct,
            options.attachedService,
          );
        }
        navigate('messages', {
          businessId,
          conversationId: existingConv.id,
          openChat: true,
        });
        return;
      }

      // If no existing conversation, create a new one for this business
      const biz = businesses.find((b) => b.id === businessId);
      const newConvId = `conv-${Date.now()}`;
      const initialText = options?.initialMessage;

      const initialMessages = initialText
        ? [
            {
              id: `msg-${Date.now()}`,
              conversationId: newConvId,
              senderId: 'user-me',
              senderName: 'You',
              text: initialText,
              timestamp: 'Just now',
              isMe: true,
              attachedProduct: options?.attachedProduct,
              attachedService: options?.attachedService,
            },
          ]
        : [];

      const newConv: Conversation = {
        id: newConvId,
        businessId,
        businessName: biz?.name || 'Verified Supplier',
        businessAvatar:
          biz?.avatar ||
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
        businessVerified: biz?.verified ?? true,
        businessCity: biz?.city || 'India',
        lastMessage: initialText || 'Direct inquiry started',
        lastMessageTime: 'Just now',
        unreadCount: 0,
        online: true,
        messages: initialMessages,
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConvId);
      navigate('messages', {
        businessId,
        conversationId: newConvId,
        openChat: true,
      });
    },
    [conversations, businesses, navigate, sendMessage],
  );

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const openEnquiryModal = (info: { title: string; businessName: string; businessId?: string }) => {
    setEnquiryModal({
      isOpen: true,
      targetTitle: info.title,
      targetBusinessName: info.businessName,
      targetBusinessId: info.businessId,
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
        posts,
        addPost,
        deletePost,
        likedPostIds,
        toggleLikePost,
        savedPostIds,
        toggleSavePost,
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
        conversations,
        activeConversationId,
        setActiveConversationId,
        sendMessage,
        openConversationWithBusiness,
        unreadMessagesCount,
        routeHistory,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
        referralData,
        walletData,
        requestWithdrawal,
        userBusiness,
        updateBusinessProfile,
        updateBusinessPost,
        setBusinessPostStatus,
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
