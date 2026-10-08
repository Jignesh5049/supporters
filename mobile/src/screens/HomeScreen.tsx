import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { CategoryScroller } from '../components/CategoryScroller';
import { CreatePostWidget } from '../components/CreatePostWidget';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

export function HomeScreen() {
  const { posts } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedSearch, setFeedSearch] = useState('');

  // Filter posts based on search and category
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.businessName.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.location.toLowerCase().includes(feedSearch.toLowerCase()) ||
      (post.attachedProduct?.title.toLowerCase().includes(feedSearch.toLowerCase()) ?? false) ||
      (post.attachedService?.title.toLowerCase().includes(feedSearch.toLowerCase()) ?? false);

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;

    if (selectedCategory === 'electronics' && post.businessName.toLowerCase().includes('electronics')) return true;
    if (selectedCategory === 'fashion' && (post.businessName.toLowerCase().includes('silk') || post.content.toLowerCase().includes('saree'))) return true;
    if (selectedCategory === 'food' && post.businessName.toLowerCase().includes('spices')) return true;
    if (selectedCategory === 'home' && post.businessName.toLowerCase().includes('wood')) return true;
    if (selectedCategory === 'technology' && post.businessName.toLowerCase().includes('tech')) return true;
    if (selectedCategory === 'services' && (post.businessName.toLowerCase().includes('packaging') || post.businessName.toLowerCase().includes('tech'))) return true;

    return true;
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Feed Quick Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={feedSearch}
          onChangeText={setFeedSearch}
          placeholder="Search posts, offers or verified updates..."
          placeholderTextColor="#667085"
        />
        {feedSearch.length > 0 && (
          <TouchableOpacity onPress={() => setFeedSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={15} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Category Scroller */}
      <CategoryScroller
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Create Post Composer Widget */}
      <CreatePostWidget />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={36} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No posts found in this category</Text>
      <Text style={styles.emptySubtitle}>
        Try selecting 'All' or adjusting your search term to see more business updates.
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSelectedCategory('all');
          setFeedSearch('');
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    padding: 12,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  resetButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
