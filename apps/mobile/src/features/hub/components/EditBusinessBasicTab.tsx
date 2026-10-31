import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Camera, Upload } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface EditBusinessBasicTabProps {
  coverImage?: string;
  avatar?: string;
  name: string;
  setName: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  about: string;
  setAbout: (v: string) => void;
  contactPerson: string;
  setContactPerson: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  onPickCover: () => void;
  onPickLogo: () => void;
}

export function EditBusinessBasicTab({
  coverImage,
  avatar,
  name,
  setName,
  category,
  setCategory,
  about,
  setAbout,
  contactPerson,
  setContactPerson,
  phone,
  setPhone,
  email,
  setEmail,
  onPickCover,
  onPickLogo,
}: EditBusinessBasicTabProps) {
  return (
    <View style={styles.formSection}>
      {/* Visual Logo & Cover preview */}
      <View style={styles.mediaPreviewCard}>
        <View style={styles.coverPreviewContainer}>
          <Image
            source={{ uri: coverImage }}
            style={styles.coverImg}
            contentFit="cover"
            transition={200}
          />
          <TouchableOpacity style={styles.changeCoverBtn} onPress={onPickCover} activeOpacity={0.8}>
            <Camera size={13} color="#FFFFFF" />
            <Text style={styles.changeBtnText}>Change Cover</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoRow}>
          <Image
            source={{ uri: avatar }}
            style={styles.logoImg}
            contentFit="cover"
            transition={200}
          />
          <TouchableOpacity style={styles.changeLogoBtn} onPress={onPickLogo} activeOpacity={0.8}>
            <Upload size={13} color={colors.primary} />
            <Text style={styles.changeLogoBtnText}>Upload New Logo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Registered Business Name *</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Shree Electronics & Systems"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Industry / Primary Category *</Text>
        <TextInput
          style={styles.textInput}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Electronics, Textile, Industrial Machinery"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>About / Business Overview</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={about}
          onChangeText={setAbout}
          placeholder="Describe your manufacturing capacity, products, and commercial specialties..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.rowFields}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Contact Person</Text>
          <TextInput
            style={styles.textInput}
            value={contactPerson}
            onChangeText={setContactPerson}
            placeholder="e.g. Aarav Mehta"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Contact Phone *</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Official Email Address</Text>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="sales@shreeelectronics.in"
          placeholderTextColor="#94A3B8"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    padding: 16,
  },
  mediaPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverPreviewContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    height: 120,
    backgroundColor: '#E2E8F0',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  logoImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  changeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeLogoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
    minHeight: 80,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
});
