import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';

interface EditBusinessAddressTabProps {
  addressLine: string;
  setAddressLine: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  pinCode: string;
  setPinCode: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  mapUrl: string;
  setMapUrl: (v: string) => void;
}

export function EditBusinessAddressTab({
  addressLine,
  setAddressLine,
  area,
  setArea,
  city,
  setCity,
  state,
  setState,
  pinCode,
  setPinCode,
  country,
  setCountry,
  mapUrl,
  setMapUrl,
}: EditBusinessAddressTabProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Street / Factory Address Line *</Text>
        <TextInput
          style={styles.textInput}
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="e.g. Plot 42, Phase II, GIDC Industrial Estate"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Area / Industrial Zone</Text>
        <TextInput
          style={styles.textInput}
          value={area}
          onChangeText={setArea}
          placeholder="e.g. Naroda Industrial Zone"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.rowFields}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>City *</Text>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="Ahmedabad"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>State *</Text>
          <TextInput
            style={styles.textInput}
            value={state}
            onChangeText={setState}
            placeholder="Gujarat"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.rowFields}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>PIN Code *</Text>
          <TextInput
            style={styles.textInput}
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="382330"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.fieldLabel}>Country</Text>
          <TextInput
            style={styles.textInput}
            value={country}
            onChangeText={setCountry}
            placeholder="India"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Google Maps Location URL</Text>
        <TextInput
          style={styles.textInput}
          value={mapUrl}
          onChangeText={setMapUrl}
          placeholder="https://maps.google.com/?q=..."
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
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
});
