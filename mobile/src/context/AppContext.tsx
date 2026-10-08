import React, { createContext, useContext, useState } from 'react';
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
  ReferralStat
} from '../../mock';

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
  | 'business_detail';

interface AppContextType {
  // Navigation
  currentRoute: ScreenRoute;
  navigate: (route: ScreenRoute, params?: any) => void;
  routeParams: any;

  // Drawer
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // User
  currentUser: UserProfile;
  updateUserProfile: (data: Partial<UserProfile>) => void;

  // Posts
  posts: FeedPost[];
  addPost: (data: {
    postType: PostType;
    content: string;
    images?: string[];
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
    attachedService?: any
  ) => void;
  unreadMessagesCount: number;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;

  // Referral
  referralData: ReferralStat;

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<ScreenRoute>('home');
  const [routeParams, setRouteParams] = useState<any>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<UserProfile>(CURRENT_USER);
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_POSTS);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv-1');
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [referralData] = useState<ReferralStat>(MOCK_REFERRAL_DATA);

  const [likedPostIds, setLikedPostIds] = useState<string[]>(['post-2']);
  const [savedPostIds, setSavedPostIds] = useState<string[]>(['post-2']);
  const [savedProductIds, setSavedProductIds] = useState<string[]>(['p-1', 'p-2']);
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>(['s-1']);
  const [savedBusinessIds, setSavedBusinessIds] = useState<string[]>(['b-1', 'b-2']);
  const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>(['b-2']);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [enquiryModal, setEnquiryModal] = useState<EnquiryTarget>({ isOpen: false });
  const [shareModal, setShareModal] = useState<ShareTarget>({ isOpen: false, title: '', url: '' });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const navigate = (route: ScreenRoute, params: any = {}) => {
    setCurrentRoute(route);
    setRouteParams(params);
    setDrawerOpen(false);
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3500);
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
    showToast('Post removed from feed', 'info');
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setCurrentUser((prev) => ({ ...prev, ...data }));
    showToast('Profile updated successfully!', 'success');
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
    setEnquiryModal({
      isOpen: true,
      targetTitle: info.title,
      targetBusinessName: info.businessName,
      targetBusinessId: info.businessId
    });
  };

  const closeEnquiryModal = () => {
    setEnquiryModal({ isOpen: false });
  };

  const openShareModal = (info: { title: string; url: string }) => {
    setShareModal({
      isOpen: true,
      title: info.title,
      url: info.url
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
        routeParams,
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
        unreadMessagesCount,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
        referralData,
        enquiryModal,
        openEnquiryModal,
        closeEnquiryModal,
        shareModal,
        openShareModal,
        closeShareModal,
        createModalOpen,
        setCreateModalOpen,
        toast,
        showToast
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
