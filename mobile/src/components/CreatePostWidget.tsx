import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function CreatePostWidget() {
  const { currentUser, addPost, setCreateModalOpen } = useApp();
  const [isComposing, setIsComposing] = useState(false);
  const [content, setContent] = useState('');

  const handlePublish = () => {
    if (!content.trim()) return;
    addPost({
      postType: 'update',
      content: content.trim(),
    });
    setContent('');
    setIsComposing(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Input Row */}
      <View style={styles.topRow}>
        <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        {isComposing ? (
          <View style={styles.composeContainer}>
            <TextInput
              style={styles.composeInput}
              value={content}
              onChangeText={setContent}
              placeholder="What's happening in your business or workshop?"
              placeholderTextColor="#9CA3AF"
              multiline
              autoFocus
            />
            <View style={styles.composeActions}>
              <TouchableOpacity
                onPress={() => setIsComposing(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePublish}
                style={[
                  styles.publishButton,
                  !content.trim() && styles.publishButtonDisabled,
                ]}
                disabled={!content.trim()}
              >
                <Text style={styles.publishText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.inputPlaceholder}
            onPress={() => setIsComposing(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.placeholderText}>
              Share business updates, catalog launches or offers...
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Action Pills */}
      {!isComposing && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={15} color={colors.primary} />
            <Text style={styles.actionText}>Update</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={15} color={colors.accentCyan} />
            <Text style={styles.actionText}>Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="construct-outline" size={15} color="#10B981" />
            <Text style={styles.actionText}>Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetag-outline" size={15} color={colors.accentMagenta} />
            <Text style={[styles.actionText, { color: colors.accentMagenta }]}>Offer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  inputPlaceholder: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  composeContainer: {
    flex: 1,
  },
  composeInput: {
    minHeight: 70,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
