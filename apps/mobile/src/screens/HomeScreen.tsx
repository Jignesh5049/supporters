import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useApp } from '../context/AppContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';
import { PostRequirementModal, FeedHeader, FeedEmptyState } from '../features/feed/components';

export function HomeScreen() {
  const { posts, addPost, showToast, routeParams, setHeaderVisible } = useApp();
  const [feedSearch, setFeedSearch] = useState('');

  // Requirement Modal states
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqDescription, setReqDescription] = useState('');
  const [reqImageUri, setReqImageUri] = useState<string | null>(null);

  // Track scroll position to hide/show header
  const lastOffsetY = useRef(0);

  useEffect(() => {
    if (routeParams?.openRequirement) {
      setReqModalOpen(true);
    }
  }, [routeParams]);

  useEffect(() => {
    return () => {
      setHeaderVisible(true);
    };
  }, [setHeaderVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastOffsetY.current;

    // At top of feed, header is always visible
    if (currentY <= 15) {
      setHeaderVisible(true);
    } else if (diff > 8 && currentY > 35) {
      // Scrolling down feed -> hide header
      setHeaderVisible(false);
    } else if (diff < -8) {
      // Scrolling back up -> show header
      setHeaderVisible(true);
    }

    lastOffsetY.current = currentY;
  };

  // Filter posts based on search
  const filteredPosts = posts.filter((post) => {
    if (!feedSearch.trim()) return true;

    const query = feedSearch.toLowerCase();
    return (
      post.content.toLowerCase().includes(query) ||
      post.businessName.toLowerCase().includes(query) ||
      post.location.toLowerCase().includes(query) ||
      (post.attachedProduct?.title.toLowerCase().includes(query) ?? false) ||
      (post.attachedService?.title.toLowerCase().includes(query) ?? false)
    );
  });

  const handlePublishRequirement = () => {
    if (!reqDescription.trim()) {
      Alert.alert('Required Field', 'Please write your requirement description.');
      return;
    }

    const trimmed = reqDescription.trim();
    const firstLine = trimmed.split('\n')[0];
    const previewTitle = firstLine.length > 55 ? firstLine.slice(0, 55) + '...' : firstLine;

    addPost({
      postType: 'offer',
      offerTag: 'BUYER REQUIREMENT',
      content: `📌 BUYER REQUIREMENT\n\n${trimmed}`,
      attachedProduct: {
        id: `req-${Date.now()}`,
        title: previewTitle,
        price: 0,
        image:
          reqImageUri ||
          'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units',
      },
      images: reqImageUri ? [reqImageUri] : undefined,
    });

    setReqDescription('');
    setReqImageUri(null);
    setReqModalOpen(false);

    showToast('Your requirement is published! Verified sellers can now reach out.', 'success');
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        ListHeaderComponent={
          <FeedHeader
            feedSearch={feedSearch}
            setFeedSearch={setFeedSearch}
            onOpenRequirementModal={() => setReqModalOpen(true)}
          />
        }
        ListEmptyComponent={<FeedEmptyState onClearSearch={() => setFeedSearch('')} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      <PostRequirementModal
        visible={reqModalOpen}
        onClose={() => setReqModalOpen(false)}
        description={reqDescription}
        setDescription={setReqDescription}
        imageUri={reqImageUri}
        setImageUri={setReqImageUri}
        onSubmit={handlePublishRequirement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 24,
  },
});
