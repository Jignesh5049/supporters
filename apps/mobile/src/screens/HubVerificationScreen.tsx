import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { VerificationUploadCard } from '../features/hub/components/VerificationUploadCard';

export function HubVerificationScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [docType, setDocType] = useState<'GSTIN' | 'Udyam'>('GSTIN');
  const [docNumber, setDocNumber] = useState('');
  const [docUploaded, setDocUploaded] = useState(false);
  const [ownerIdUploaded, setOwnerIdUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'not_submitted' | 'under_review'>(
    'not_submitted',
  );

  const handleSubmit = () => {
    if (!docNumber.trim()) {
      showToast(`Please enter your valid ${docType} number`, 'error');
      return;
    }
    if (!docUploaded) {
      showToast('Please upload your business registration certificate', 'error');
      return;
    }
    if (!ownerIdUploaded) {
      showToast('Please upload the owner/director ID document', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setVerificationStatus('under_review');
      showToast('Verification documents submitted for review!', 'success');
    }, 600);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status Banner */}
        {verificationStatus === 'under_review' ? (
          <View style={styles.statusReviewBanner}>
            <AlertCircle size={28} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.statusReviewTitle}>Documents Under Review</Text>
            <Text style={styles.statusReviewText}>
              Our compliance team is verifying your {docType} certificate and credentials. The
              Verified badge will appear on your profile within 24 to 48 hours.
            </Text>
          </View>
        ) : (
          <View style={styles.perksBanner}>
            <ShieldCheck size={32} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={styles.perksTitle}>Get the Verified Supplier Badge</Text>
            <Text style={styles.perksSubtitle}>
              Verification is completely free and separates legitimate registered manufacturers and
              traders from unverified accounts.
            </Text>

            <View style={styles.perkList}>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>Prominent Green Shield on all products & posts</Text>
              </View>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>Higher search ranking in local discovery</Text>
              </View>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>Access to high-value buyer RFQs and tenders</Text>
              </View>
            </View>
          </View>
        )}

        {/* Verification Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Verification Documents</Text>

          {/* Doc Type Selector */}
          <Text style={styles.label}>Select Registration Type</Text>
          <View style={styles.typeSelector}>
            {(['GSTIN', 'Udyam'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeOption, docType === type && styles.typeOptionActive]}
                onPress={() => setDocType(type)}
              >
                <Text
                  style={[styles.typeOptionText, docType === type && styles.typeOptionTextActive]}
                >
                  {type === 'GSTIN' ? 'GST Registration' : 'Udyam / MSME'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Registration Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {docType === 'GSTIN' ? '15-Digit GSTIN Number *' : 'Udyam Registration Number *'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                docType === 'GSTIN' ? 'e.g. 24ABCDE1234F1Z5' : 'e.g. UDYAM-GJ-01-0012345'
              }
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              value={docNumber}
              onChangeText={setDocNumber}
            />
          </View>

          {/* Document Upload Cards */}
          <Text style={styles.label}>Upload Registration Certificate *</Text>
          <VerificationUploadCard
            label={`Upload ${docType} Certificate`}
            sublabel="PDF or JPG up to 10MB"
            isUploaded={docUploaded}
            onToggleUpload={() => setDocUploaded(!docUploaded)}
          />

          <Text style={styles.label}>Authorized Signatory / Owner Photo ID *</Text>
          <VerificationUploadCard
            label="Upload Aadhaar / PAN / Passport"
            sublabel="Government approved photo identity"
            isUploaded={ownerIdUploaded}
            onToggleUpload={() => setOwnerIdUploaded(!ownerIdUploaded)}
          />

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
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
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  statusReviewBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusReviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  statusReviewText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  perksBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  perksTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  perksSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  perkList: {
    gap: 8,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
