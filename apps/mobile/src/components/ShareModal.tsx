import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Share,
  Platform,
} from 'react-native';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function ShareModal() {
  const insets = useSafeAreaInsets();
  const { shareModal, closeShareModal, showToast } = useApp();

  if (!shareModal.isOpen) return null;

  const handleNativeShare = async () => {
    closeShareModal();
    try {
      await Share.share({
        message: `${shareModal.title} - View on Supporters: ${shareModal.url}`,
        title: shareModal.title,
      });
    } catch {
      // Ignored
    }
  };

  const handleCopyLink = () => {
    closeShareModal();
    showToast('Listing link copied to clipboard!', 'success');
  };

  return (
    <Modal
      visible={shareModal.isOpen}
      transparent
      animationType="slide"
      onRequestClose={closeShareModal}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={closeShareModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.dragIndicator} />

          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>Share Listing</Text>
            <TouchableOpacity onPress={closeShareModal} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <Text style={styles.shareSubtitle} numberOfLines={1}>
            {shareModal.title}
          </Text>

          <View style={styles.shareGrid}>
            <TouchableOpacity
              onPress={handleNativeShare}
              style={styles.shareItem}
              activeOpacity={0.7}
            >
              <View style={[styles.shareIconBox, { backgroundColor: '#25D366' }]}>
                <FontAwesome name="whatsapp" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNativeShare}
              style={styles.shareItem}
              activeOpacity={0.7}
            >
              <View style={[styles.shareIconBox, { backgroundColor: '#0A66C2' }]}>
                <FontAwesome name="linkedin" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.shareLabel}>LinkedIn</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyLink} style={styles.shareItem} activeOpacity={0.7}>
              <View style={[styles.shareIconBox, { backgroundColor: '#4B5563' }]}>
                <Feather name="copy" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.shareLabel}>Copy Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNativeShare}
              style={styles.shareItem}
              activeOpacity={0.7}
            >
              <View style={[styles.shareIconBox, { backgroundColor: colors.primary }]}>
                <Feather name="share-2" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.shareLabel}>More Apps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  shareSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  shareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  shareItem: {
    alignItems: 'center',
    gap: 6,
  },
  shareIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
