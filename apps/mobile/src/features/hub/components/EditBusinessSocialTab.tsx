import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';

interface EditBusinessSocialTabProps {
  instagram: string;
  setInstagram: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  facebook: string;
  setFacebook: (v: string) => void;
  youtube: string;
  setYoutube: (v: string) => void;
}

export function EditBusinessSocialTab({
  instagram,
  setInstagram,
  website,
  setWebsite,
  facebook,
  setFacebook,
  youtube,
  setYoutube,
}: EditBusinessSocialTabProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Instagram Handle</Text>
        <TextInput
          style={styles.textInput}
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@shree_electronics_official"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Company Website URL</Text>
        <TextInput
          style={styles.textInput}
          value={website}
          onChangeText={setWebsite}
          placeholder="https://shreeelectronics.in"
          placeholderTextColor="#94A3B8"
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Facebook Page Link</Text>
        <TextInput
          style={styles.textInput}
          value={facebook}
          onChangeText={setFacebook}
          placeholder="https://facebook.com/shreeelectronics"
          placeholderTextColor="#94A3B8"
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>YouTube Channel / Demo Reel</Text>
        <TextInput
          style={styles.textInput}
          value={youtube}
          onChangeText={setYoutube}
          placeholder="https://youtube.com/@shreeelectronics"
          placeholderTextColor="#94A3B8"
          keyboardType="url"
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
});

