import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';
import type { PostType } from '../../../../mock';

interface CreatePostFormFieldsProps {
  activeTab: PostType;
  title: string;
  setTitle: (v: string) => void;
  offerTag: string;
  setOfferTag: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  moq: string;
  setMoq: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
}

export function CreatePostFormFields({
  activeTab,
  title,
  setTitle,
  offerTag,
  setOfferTag,
  price,
  setPrice,
  moq,
  setMoq,
  unit,
  setUnit,
  content,
  setContent,
}: CreatePostFormFieldsProps) {
  const isListing = activeTab === 'product' || activeTab === 'service' || activeTab === 'offer';

  return (
    <View style={styles.container}>
      {isListing && (
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

      {isListing && (
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Price (₹) *</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 24500"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {activeTab !== 'service' && (
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Min Order (MOQ)</Text>
              <TextInput
                style={styles.textInput}
                value={moq}
                onChangeText={setMoq}
                placeholder="e.g. 5"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              style={styles.textInput}
              value={unit}
              onChangeText={setUnit}
              placeholder={activeTab === 'service' ? 'per hr' : 'Units'}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          {activeTab === 'update'
            ? 'What is happening in your business? *'
            : 'Detailed Description / Specifications'}
        </Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder={
            activeTab === 'update'
              ? 'Share production milestones, new machinery installs, bulk delivery dispatches...'
              : 'Add technical specifications, grade, warranty terms and supply capabilities...'
          }
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 90,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
});
