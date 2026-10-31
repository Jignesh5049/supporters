import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { PostType } from '../../../mock';
import { colors } from '../../styles/theme';

const BUSINESS_PRESET_IMAGES = [
  {
    label: 'Industrial / Factory',
    uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Electronics / Tech',
    uri: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Textiles & Silk',
    uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Spices & Food',
    uri: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Woodwork & Interior',
    uri: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop&q=80',
  },
];

export function CreateScreen() {
  const { addPost, navigate, showToast } = useApp();
  const routeParams = useLocalSearchParams<{ initialTab?: string }>();

  const [activeTab, setActiveTab] = useState<PostType>(
    (routeParams?.initialTab as PostType) || 'update',
  );

  // Form states
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [unit, setUnit] = useState('Units');
  const [offerTag, setOfferTag] = useState('SPECIAL WHOLESALE DEAL');

  // Image Upload and Aspect Ratio states
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isUploading, setIsUploading] = useState(false);

  // Image Picker: Launch Photo Library
  const handlePickImage = async () => {
    try {
      setIsUploading(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Supporters needs access to your photo library to attach images to your listings.',
        );
        setIsUploading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.height && asset.width && asset.height > asset.width * 1.2) {
          setAspectRatio('9:16');
        } else {
          setAspectRatio('16:9');
        }
        setImageUri(asset.uri);
        showToast('Image uploaded successfully!', 'success');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Image Picker: Launch Camera
  const handleTakePhoto = async () => {
    try {
      setIsUploading(true);
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPerm.granted) {
        Alert.alert(
          'Camera Permission',
          'Supporters needs camera access to capture catalog and workshop photos.',
        );
        setIsUploading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.height && asset.width && asset.height > asset.width * 1.2) {
          setAspectRatio('9:16');
        } else {
          setAspectRatio('16:9');
        }
        setImageUri(asset.uri);
        showToast('Photo captured!', 'success');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open camera.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPreset = (uri: string) => {
    setImageUri(uri);
    showToast('Catalog image selected', 'info');
  };

  const handleSubmit = () => {
    const postImages = imageUri ? [imageUri] : undefined;

    if (activeTab === 'update') {
      if (!content.trim() && !imageUri) {
        Alert.alert('Required', 'Please write a message or attach a photo for your update.');
        return;
      }
      addPost({
        postType: 'update',
        content: content.trim() || 'New business update from verified facilities.',
        images: postImages,
        aspectRatio,
      });
    } else if (activeTab === 'product') {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter a product title or name.');
        return;
      }
      addPost({
        postType: 'product',
        content: content.trim() || `New inventory batch ready for dispatch: ${title}`,
        images: postImages,
        aspectRatio,
        attachedProduct: {
          id: `p-${Date.now()}`,
          title: title.trim(),
          price: parseInt(price) || 999,
          image:
            imageUri ||
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
          moq: parseInt(moq) || 1,
          unit: unit.trim() || 'Units',
        },
      });
    } else if (activeTab === 'service') {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter a service title.');
        return;
      }
      addPost({
        postType: 'service',
        content: content.trim() || `Professional service open for booking: ${title}`,
        images: postImages,
        aspectRatio,
        attachedService: {
          id: `s-${Date.now()}`,
          title: title.trim(),
          startingPrice: parseInt(price) || 1500,
          image:
            imageUri ||
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
          unit: unit.trim() || 'per job',
        },
      });
    } else if (activeTab === 'offer') {
      if (!content.trim() && !title.trim() && !imageUri) {
        Alert.alert('Required', 'Please enter offer details or an image.');
        return;
      }
      addPost({
        postType: 'offer',
        offerTag: offerTag.trim() || 'LIMITED TIME DISCOUNT',
        content:
          content.trim() || `Special commercial discount available on ${title || 'bulk orders'}!`,
        images: postImages,
        aspectRatio,
        attachedProduct: title.trim()
          ? {
              id: `p-${Date.now()}`,
              title: title.trim(),
              price: parseInt(price) || 4999,
              image:
                imageUri ||
                'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
              moq: parseInt(moq) || 1,
              unit: unit.trim() || 'Lot',
            }
          : undefined,
      });
    }

    navigate('home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Listing</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'update', label: 'Update' },
          { key: 'product', label: 'Product' },
          { key: 'service', label: 'Service' },
          { key: 'offer', label: 'Offer' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Form Fields */}
        {(activeTab === 'product' || activeTab === 'service' || activeTab === 'offer') && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {activeTab === 'product'
                ? 'Product Title / Name *'
                : activeTab === 'service'
                  ? 'Service Title *'
                  : 'Offer Headline *'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 55-Inch 4K Commercial Display Panel"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {activeTab === 'offer' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Offer Banner Tag</Text>
            <TextInput
              style={styles.textInput}
              value={offerTag}
              onChangeText={setOfferTag}
              placeholder="e.g. FESTIVE WHOLESALE OFFER (15% OFF)"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {(activeTab === 'product' || activeTab === 'service' || activeTab === 'offer') && (
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.textInput}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g. 18500"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>MOQ / Unit</Text>
              <TextInput
                style={styles.textInput}
                value={moq}
                onChangeText={setMoq}
                placeholder="e.g. 5"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {activeTab === 'update' ? 'Post Update Content *' : 'Description & Terms'}
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={content}
            onChangeText={setContent}
            placeholder="Share dispatch schedule, warranty specs, MOQ details or commercial terms..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* IMAGE UPLOAD & ASPECT RATIO SECTION */}
        <View style={styles.uploadSection}>
          <View style={styles.uploadHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Feed Image</Text>
              <Text style={styles.sectionSubtitle}>
                Attach photo · Aspect ratio is detected automatically
              </Text>
            </View>
          </View>

          {/* Uploaded Image Preview or Upload Buttons */}
          {imageUri ? (
            <View style={styles.previewCard}>
              <View
                style={[
                  styles.previewImageContainer,
                  aspectRatio === '9:16' ? styles.previewContainer916 : styles.previewContainer169,
                ]}
              >
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.changeImageBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={13} color={colors.primary} />
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={13} color="#DC2626" />
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadBox}>
              <View style={styles.uploadButtonsRow}>
                <TouchableOpacity
                  style={styles.uploadOptionBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="images-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.uploadOptionTitle}>Choose Photo</Text>
                  <Text style={styles.uploadOptionDesc}>From your gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadOptionBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#E0F7FE' }]}>
                    <Ionicons name="camera-outline" size={22} color={colors.accentCyan} />
                  </View>
                  <Text style={styles.uploadOptionTitle}>Take Photo</Text>
                  <Text style={styles.uploadOptionDesc}>Direct camera snap</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Preset Images */}
              <View style={styles.presetSection}>
                <Text style={styles.presetHeading}>Or pick a sample category photo:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.presetScroller}
                >
                  {BUSINESS_PRESET_IMAGES.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSelectPreset(preset.uri)}
                      style={styles.presetChip}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: preset.uri }} style={styles.presetThumb} />
                      <Text style={styles.presetLabel} numberOfLines={1}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Listings with {aspectRatio} images get up to 3.4x more inquiries from verified B2B
            buyers.
          </Text>
        </View>

        <TouchableOpacity style={styles.publishBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Feather name="check" size={16} color="#FFFFFF" />
          <Text style={styles.publishBtnText}>Publish to Supporters Feed</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  formScroll: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  uploadHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  ratioSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  ratioBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratioBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  ratioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  ratioBtnTextActive: {
    color: colors.primary,
  },
  uploadBox: {
    marginTop: 4,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadOptionBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadOptionDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  presetSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  presetScroller: {
    flexDirection: 'row',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingRight: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  presetThumb: {
    width: 28,
    height: 28,
    marginRight: 6,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewCard: {
    marginTop: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImageContainer: {
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  previewContainer169: {
    aspectRatio: 16 / 9,
  },
  previewContainer916: {
    aspectRatio: 9 / 16,
    maxHeight: 380,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    justifyContent: 'flex-end',
    gap: 8,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    gap: 4,
  },
  changeImageText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  removeImageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 11,
    color: colors.primary,
    flex: 1,
    lineHeight: 16,
  },
  publishBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 30,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
