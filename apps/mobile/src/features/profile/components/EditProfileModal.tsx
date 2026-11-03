import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Check } from 'lucide-react-native';
import { UserProfile } from '../../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSave: (updated: Partial<UserProfile>) => void;
}

export function EditProfileModal({ visible, onClose, currentUser, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [city, setCity] = useState(currentUser.city);
  const [state, setState] = useState(currentUser.state);

  useEffect(() => {
    if (visible) {
      setName(currentUser.name);
      setUsername(currentUser.username);
      setBio(currentUser.bio);
      setPhone(currentUser.phone);
      setEmail(currentUser.email);
      setCity(currentUser.city);
      setState(currentUser.state);
    }
  }, [visible, currentUser]);

  const handleSave = () => {
    onSave({
      name: name.trim() || currentUser.name,
      username: username.trim() || currentUser.username,
      bio: bio.trim(),
      phone: phone.trim() || currentUser.phone,
      email: email.trim() || currentUser.email,
      city: city.trim() || currentUser.city,
      state: state.trim() || currentUser.state,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Cancel"
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Update Profile</Text>

            <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} activeOpacity={0.8}>
              <Text style={styles.saveHeaderBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Form Scroll */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar Preview */}
            <View style={styles.avatarRow}>
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.avatarImg}
                contentFit="cover"
                cachePolicy="disk"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <View style={styles.usernameWrap}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={[styles.fieldInput, styles.usernameInput]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio / Business Summary</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a brief description..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Phone</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 Phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={styles.saveSubmitBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.saveSubmitBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formScroll: {
    paddingHorizontal: spacing.md,
  },
  formContent: {
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.border,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 5,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
  },
  fieldInputMultiline: {
    height: 80,
  },
  usernameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingLeft: 10,
  },
  atSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 4,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  saveSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    marginTop: 10,
  },
  saveSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
