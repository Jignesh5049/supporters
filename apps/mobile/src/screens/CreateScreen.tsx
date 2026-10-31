import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import type { PostType } from '../../mock';
import {
  CreatePostTabs,
  CreatePostFormFields,
  CreateMediaUploader,
  CreateSubmitButton,
} from '../features/create/components';

export function CreateScreen() {
  const { addPost, navigate, routeParams, showToast } = useApp();

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

  const handlePickImage = async () => {
    try {
      setIsUploading(true);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Supporters needs access to your photo library to attach images to your listings.',
        );
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
    } catch {
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploading(true);
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPerm.granted) {
        Alert.alert(
          'Camera Permission',
          'Supporters needs camera access to capture catalog and workshop photos.',
        );
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
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    } finally {
      setIsUploading(false);
    }
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
          price: parseInt(price, 10) || 999,
          image:
            imageUri ||
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
          moq: parseInt(moq, 10) || 1,
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
          startingPrice: parseInt(price, 10) || 1500,
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
              price: parseInt(price, 10) || 4999,
              image:
                imageUri ||
                'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
              moq: parseInt(moq, 10) || 1,
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
        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Listing</Text>
      </View>

      <CreatePostTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <CreatePostFormFields
          activeTab={activeTab}
          title={title}
          setTitle={setTitle}
          offerTag={offerTag}
          setOfferTag={setOfferTag}
          price={price}
          setPrice={setPrice}
          moq={moq}
          setMoq={setMoq}
          unit={unit}
          setUnit={setUnit}
          content={content}
          setContent={setContent}
        />

        <CreateMediaUploader
          imageUri={imageUri}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          onPickImage={handlePickImage}
          onTakePhoto={handleTakePhoto}
          onSelectPreset={(uri) => {
            setImageUri(uri);
            showToast('Catalog image selected', 'info');
          }}
          onRemoveImage={() => setImageUri(null)}
          isUploading={isUploading}
        />

        <CreateSubmitButton activeTab={activeTab} onSubmit={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formScroll: {
    flex: 1,
  },
});
