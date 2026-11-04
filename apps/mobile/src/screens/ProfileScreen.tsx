import React, { useState } from 'react';
import { ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { ProfileHero } from '../features/profile/components/ProfileHero';
import { ProfileStatsBar } from '../features/profile/components/ProfileStatsBar';
import { ProfileTabs } from '../features/profile/components/ProfileTabs';
import { EditProfileModal } from '../features/profile/components/EditProfileModal';
import { useMyBusiness } from '../features/business/hooks';
import { useBusinessPosts } from '../features/feed/hooks';
import { usePostActions } from '../features/feed/use-post-actions';
import { useFollowing } from '../features/social/hooks/use-follow';
import { FollowingModal } from '../features/profile/components/FollowingModal';

export function ProfileScreen() {
  const { currentUser, updateUserProfile, products, openConversationWithBusiness, navigate } =
    useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);

  const postActions = usePostActions();
  const myBusiness = useMyBusiness();
  const myPosts =
    useBusinessPosts(myBusiness.data?.id).data?.pages.flatMap((page) => page.data) ?? [];
  const following = useFollowing();
  const followingCount = following.data?.pages.flatMap((page) => page.data).length ?? 0;
  const myProducts = products.filter((p) => p.businessId === currentUser.businessId);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <ProfileHero
          currentUser={currentUser}
          onEditProfile={() => setIsEditModalOpen(true)}
          onOpenSettings={() => navigate('settings')}
          onOpenReferral={() => navigate('referral')}
          onUpdateAvatar={(uri) => updateUserProfile({ avatar: uri })}
          onUpdateCover={(uri) => updateUserProfile({ coverImage: uri })}
        />

        <ProfileStatsBar
          followingCount={followingCount}
          businessesCount={currentUser.businessesCount}
          businessId={currentUser.businessId}
          onOpenFollowing={() => setIsFollowingModalOpen(true)}
          onOpenStorefront={() =>
            navigate('business_detail', { businessId: currentUser.businessId })
          }
          onOpenHub={() => navigate('business_hub')}
          onOpenWallet={() => navigate('wallet')}
          onOpenPro={() => navigate('subscription')}
        />

        <ProfileTabs
          currentUser={currentUser}
          posts={myPosts}
          postActions={postActions}
          products={myProducts}
          onOpenProduct={(productId) => navigate('product_detail', { productId })}
          onContactProductSupplier={(p) =>
            openConversationWithBusiness(p.businessId, {
              initialMessage: `Namaste! I am interested in "${p.title}" (₹${p.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
              attachedProduct: p,
            })
          }
          onEditProfile={() => setIsEditModalOpen(true)}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={currentUser}
        onSave={(updated) => updateUserProfile(updated)}
      />

      {/* Following List Modal */}
      <FollowingModal
        visible={isFollowingModalOpen}
        onClose={() => setIsFollowingModalOpen(false)}
        onOpenBusiness={(slug) => router.push(`/business/${encodeURIComponent(slug)}`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
});
