import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { useApp } from '../context/AppContext';

export function CreateRequirementScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Packaging & Printing');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('');
  const [urgency, setUrgency] = useState<'Immediate' | 'Within 15 Days' | 'Within 1 Month'>(
    'Immediate',
  );
  const [description, setDescription] = useState('');

  const categories = [
    'Packaging & Printing',
    'Textiles & Apparel',
    'Engineering & Machinery',
    'Chemicals & Plastics',
    'Electronics & Electrical',
  ];

  const handleSubmit = () => {
    if (!title.trim() || !quantity.trim() || !budget.trim()) {
      showToast('Title, quantity and budget are required', 'error');
      return;
    }

    showToast('Buyer requirement RFQ published successfully!', 'success');
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Buyer Requirement (RFQ)</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitle}>
          Broadcast your procurement needs directly to verified Indian manufacturers and
          distributors.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Requirement Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50,000 Pcs Corrugated Shipping Boxes"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, category === cat && styles.pillActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Required Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10 Tons / 500 pcs"
              placeholderTextColor="#9CA3AF"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Target Budget (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹4,50,000"
              placeholderTextColor="#9CA3AF"
              value={budget}
              onChangeText={setBudget}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Delivery Destination City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Surat, Gujarat"
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Urgency</Text>
          <View style={styles.urgencyRow}>
            {(['Immediate', 'Within 15 Days', 'Within 1 Month'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.urgencyBtn, urgency === u && styles.urgencyBtnActive]}
                onPress={() => setUrgency(u)}
              >
                <Text style={[styles.urgencyBtnText, urgency === u && styles.urgencyBtnTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Specifications & Requirements Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe technical specs, material grades, tolerance, packaging needs..."
            placeholderTextColor="#9CA3AF"
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Broadcast RFQ to Suppliers</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  urgencyBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  urgencyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
