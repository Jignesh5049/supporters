import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../../styles/theme';

export interface CommentData {
  id: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timeAgo: string;
}

export interface PostCommentItemProps {
  comment: CommentData;
}

export function PostCommentItem({ comment }: PostCommentItemProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: comment.authorAvatar }}
        style={styles.avatar}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View style={styles.bubble}>
        <View style={styles.header}>
          <Text style={styles.name}>{comment.authorName}</Text>
          <Text style={styles.timeAgo}>{comment.timeAgo}</Text>
        </View>
        <Text style={styles.text}>{comment.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  text: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
