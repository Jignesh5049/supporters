import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PostType } from '../../mock';
import { colors } from '../styles/theme';

export function CreateScreen() {
  const { addPost, navigate, routeParams } = useApp();

  const [activeTab, setActiveTab] = useState<PostType>(
    (routeParams?.initialTab as PostType) || 'update'
  );

  // Form states
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [unit, setUnit] = useState('Units');
  const [offerTag, setOfferTag] = useState('SPECIAL WHOLESALE DEAL');

  const handleSubmit = () => {
    if (activeTab === 'update') {
      if (!content.trim()) return;
      addPost({
        postType: 'update',
        content: content.trim(),
      });
    } else if (activeTab === 'product') {
      if (!title.trim()) return;
      addPost({
        postType: 'product',
        content: content.trim() || `New inventory batch ready for dispatch: ${title}`,
        attachedProduct: {
          id: `p-${Date.now()}`,
          title: title.trim(),
          price: parseInt(price) || 999,
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
          moq: parseInt(moq) || 1,
          unit: unit.trim() || 'Units',
        },
      });
    } else if (activeTab === 'service') {
      if (!title.trim()) return;
      addPost({
        postType: 'service',
        content: content.trim() || `Professional service open for booking: ${title}`,
        attachedService: {
          id: `s-${Date.now()}`,
          title: title.trim(),
          startingPrice: parseInt(price) || 1500,
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
          unit: unit.trim() || 'per job',
        },
      });
    } else if (activeTab === 'offer') {
      if (!content.trim() && !title.trim()) return;
      addPost({
        postType: 'offer',
        offerTag: offerTag.trim() || 'LIMITED TIME DISCOUNT',
        content: content.trim() || `Special commercial discount available on ${title || 'bulk orders'}!`,
        attachedProduct: title.trim()
          ? {
              id: `p-${Date.now()}`,
              title: title.trim(),
              price: parseInt(price) || 4999,
              image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80',
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
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
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

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            Listings are broadcast to verified B2B buyers and appear in your business catalog instantly.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
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
