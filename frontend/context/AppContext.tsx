'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FeedPost,
  Product,
  Service,
  Business,
  Conversation,
  NotificationItem,
  PostType,
  ReferralStat,
  WalletSummary,
  WalletTransaction,
  WithdrawalRequest
} from '@/types';
import {
  MOCK_POSTS,
  MOCK_PRODUCTS,
  MOCK_SERVICES,
  MOCK_BUSINESSES,
  MOCK_CONVERSATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_REFERRAL_DATA,
  MOCK_WALLET_DATA,
  CURRENT_USER
} from '@/lib/mock-data';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface DraftListing {
  id: string;
  type: 'product' | 'service' | 'post' | 'offer';
  title: string;
  category?: string;
  price?: string;
  moq?: string;
  unit?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  offerTag?: string;
  resumeUrl: string;
  updatedAt?: string;
}

interface EnquiryTarget {
  isOpen: boolean;
  targetTitle?: string;
  targetBusinessName?: string;
  targetBusinessId?: string;
}

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

interface AppContextType {
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
    attachedService?: any
  ) => void;
  unreadMessagesCount: number;
  openConversationWithBusiness: (
    businessId: string,
    options?: {
      initialMessage?: string;
      attachedProduct?: any;
      attachedService?: any;
    }
  ) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Enquiry Modal
  enquiryState: EnquiryTarget;
  openEnquiryModal: (info: { title: string; businessName: string; businessId?: string }) => void;
  closeEnquiryModal: () => void;

  // Referral & Wallet
  referralData: ReferralStat;
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

  // Business Management
  userBusiness: Business | undefined;
  updateBusinessProfile: (data: Partial<Business>) => void;
  updateBusinessPost: (postId: string, data: Partial<FeedPost>) => void;
  setBusinessPostStatus: (postId: string, status: 'Published' | 'Draft' | 'Archived') => void;
  deletePost: (postId: string) => void;

  // Confirmation Modal
  confirmationState: ConfirmationState;
  openConfirmationModal: (params: {
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => void;
  closeConfirmationModal: () => void;

  // Mobile Create Modal
  mobileCreateModalOpen: boolean;
  openMobileCreateModal: () => void;
  closeMobileCreateModal: () => void;

  // Draft Listing state
  draftListing: DraftListing | null;
  saveDraftListing: (draft: DraftListing) => void;
  clearDraftListing: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);

  const [likedPostIds, setLikedPostIds] = useState<string[]>(['post-2']);
  const [savedPostIds, setSavedPostIds] = useState<string[]>(['post-2']);
  const [savedProductIds, setSavedProductIds] = useState<string[]>(['p-1', 'p-2']);
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>(['s-1']);
  const [savedBusinessIds, setSavedBusinessIds] = useState<string[]>(['b-1', 'b-2']);
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>(['b-2']);

  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1');

  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [referralData] = useState<ReferralStat>(MOCK_REFERRAL_DATA);
  const [walletData, setWalletData] = useState<WalletSummary>(MOCK_WALLET_DATA);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [enquiryState, setEnquiryState] = useState<EnquiryTarget>({
    isOpen: false
  });

  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [mobileCreateModalOpen, setMobileCreateModalOpen] = useState(false);
  const openMobileCreateModal = () => setMobileCreateModalOpen(true);
  const closeMobileCreateModal = () => setMobileCreateModalOpen(false);

  // Unsaved Draft Listing state (persists across sessions)
  const [draftListing, setDraftListing] = useState<DraftListing | null>(null);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('supporters_active_draft');
      if (savedDraft) {
        setDraftListing(JSON.parse(savedDraft));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveDraftListing = (draft: DraftListing) => {
    setDraftListing(draft);
    try {
      localStorage.setItem('supporters_active_draft', JSON.stringify(draft));
    } catch {
      // Ignore
    }
  };

  const clearDraftListing = () => {
    setDraftListing(null);
    try {
      localStorage.removeItem('supporters_active_draft');
    } catch {
      // Ignore
    }
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
              isLiked: !isLiked
            };
          }
          return p;
        })
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
      showToast(isSaved ? 'Removed from saved products' : 'Product saved to your collection', 'success');
      return next;
    });
  };

  const toggleSaveService = (serviceId: string) => {
    setSavedServiceIds((prev) => {
      const isSaved = prev.includes(serviceId);
      const next = isSaved ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      showToast(isSaved ? 'Removed from saved services' : 'Service saved to your collection', 'success');
      return next;
    });
  };

  const toggleSaveBusiness = (businessId: string) => {
    setSavedBusinessIds((prev) => {
      const isSaved = prev.includes(businessId);
      const next = isSaved ? prev.filter((id) => id !== businessId) : [...prev, businessId];
      showToast(isSaved ? 'Removed from saved businesses' : 'Business saved to your collection', 'success');
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
              isFollowed: !isFollowing
            };
          }
          return b;
        })
      );
      showToast(isFollowing ? 'Unfollowed business' : 'You are now following this business', 'info');
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
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      businessId: 'b-1',
      businessName: 'Shree Electronics & Systems',
      businessAvatar: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&auto=format&fit=crop&q=80',
      businessVerified: true,
      location: 'Ahmedabad',
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
      isSaved: false
    };

    setPosts((prev) => [newPost, ...prev]);
    showToast('Your update has been published to Supporters feed!', 'success');
  };

  const deletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast('Post deleted from your business page', 'info');
  };

  // Business Management
  const userBusiness = businesses.find((b) => b.id === (CURRENT_USER.businessId || 'b-1')) || businesses[0];

  const updateBusinessProfile = (data: Partial<Business>) => {
    const bizId = CURRENT_USER.businessId || 'b-1';
    setBusinesses((prev) =>
      prev.map((b) => (b.id === bizId ? { ...b, ...data } : b))
    );
    showToast('Business profile updated successfully!', 'success');
  };

  const updateBusinessPost = (postId: string, data: Partial<FeedPost>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...data } : p))
    );
    showToast('Post updated successfully!', 'success');
  };

  const setBusinessPostStatus = (postId: string, status: 'Published' | 'Draft' | 'Archived') => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, postStatus: status } : p))
    );
    showToast(`Post marked as ${status}`, 'info');
  };

  // Wallet & Withdrawals
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
      return { success: false, message: 'Amount exceeds your available wallet balance' };
    }
    if (params.amount < 100) {
      return { success: false, message: 'Minimum withdrawal amount is ₹100' };
    }

    const refId = `WDL-${Math.floor(100000 + Math.random() * 900000)}`;

    const newWithdrawal: WithdrawalRequest = {
      id: `wd-${Date.now()}`,
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
      estimatedDate: 'Within 24-48 business hours'
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
      description: 'Payout requested to linked account. Under automated verification.'
    };

    setWalletData((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - params.amount,
      pendingWithdrawals: prev.pendingWithdrawals + params.amount,
      transactions: [newTx, ...prev.transactions],
      withdrawalRequests: [newWithdrawal, ...prev.withdrawalRequests]
    }));

    showToast(`Withdrawal request for ₹${params.amount.toLocaleString('en-IN')} submitted!`, 'success');
    return { success: true, message: 'Withdrawal request submitted successfully' };
  };

  const sendMessage = (
    conversationId: string,
    text: string,
    attachedProduct?: any,
    attachedService?: any
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
      attachedService
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );
    showToast('Message sent', 'info');
  };

  const openConversationWithBusiness = (
    businessId: string,
    options?: {
      initialMessage?: string;
      attachedProduct?: any;
      attachedService?: any;
    }
  ) => {
    // 1. Check if conversation already exists
    const existingConv = conversations.find((c) => c.businessId === businessId);

    if (existingConv) {
      setActiveConversationId(existingConv.id);
      if (options?.initialMessage) {
        sendMessage(
          existingConv.id,
          options.initialMessage,
          options.attachedProduct,
          options.attachedService
        );
      }
      showToast(`Opening chat with ${existingConv.businessName}...`, 'info');
      router.push('/messages');
      return;
    }

    // 2. If no existing conversation, create a new one
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

    const newConversation: Conversation = {
      id: newConvId,
      businessId,
      businessName: biz?.name || 'Verified Supplier',
      businessAvatar:
        biz?.avatar ||
        'https://images.unsplash.com/photo-1560179704-617a1a2e8172?auto=format&fit=crop&w=120&q=80',
      businessVerified: biz?.verified ?? true,
      businessCity: biz?.city || 'India',
      lastMessage: initialText || 'Started conversation',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      online: true,
      messages: initialMessages,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConvId);
    showToast(`Started direct chat with ${newConversation.businessName}!`, 'success');
    router.push('/messages');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  const openEnquiryModal = (info: { title: string; businessName: string; businessId?: string }) => {
    setEnquiryState({
      isOpen: true,
      targetTitle: info.title,
      targetBusinessName: info.businessName,
      targetBusinessId: info.businessId
    });
  };

  const closeEnquiryModal = () => {
    setEnquiryState({ isOpen: false });
  };

  const openConfirmationModal = (params: {
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmationState({
      isOpen: true,
      ...params
    });
  };

  const closeConfirmationModal = () => {
    setConfirmationState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AppContext.Provider
      value={{
        posts,
        addPost,
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

        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,

        toasts,
        showToast,
        removeToast,

        enquiryState,
        openEnquiryModal,
        closeEnquiryModal,

        confirmationState,
        openConfirmationModal,
        closeConfirmationModal,

        mobileCreateModalOpen,
        openMobileCreateModal,
        closeMobileCreateModal,

        draftListing,
        saveDraftListing,
        clearDraftListing,

        referralData,
        walletData,
        requestWithdrawal,
        userBusiness,
        updateBusinessProfile,
        updateBusinessPost,
        setBusinessPostStatus,
        deletePost
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
