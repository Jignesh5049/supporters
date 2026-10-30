import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function BusinessEditScreen() {
  const { userBusiness, updateBusinessProfile, navigate, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'address' | 'hours'>('basic');

  // Form states initialized with userBusiness
  const [name, setName] = useState(userBusiness?.name || '');
  const [category, setCategory] = useState(userBusiness?.category || '');
  const [about, setAbout] = useState(userBusiness?.about || '');
  const [avatar, setAvatar] = useState(userBusiness?.avatar || '');
  const [coverImage, setCoverImage] = useState(userBusiness?.coverImage || '');
  const [contactPerson, setContactPerson] = useState(userBusiness?.contactPerson || 'Aarav Mehta');
  const [phone, setPhone] = useState(userBusiness?.phone || '');
  const [email, setEmail] = useState(userBusiness?.email || '');

  // Social & Website
  const [instagram, setInstagram] = useState(
    userBusiness?.instagram || '@shree_electronics_official',
  );
  const [website, setWebsite] = useState(userBusiness?.website || 'https://shreeelectronics.in');
  const [facebook, setFacebook] = useState(
    userBusiness?.facebook || 'https://facebook.com/shreeelectronics',
  );
  const [youtube, setYoutube] = useState(
    userBusiness?.youtube || 'https://youtube.com/@shreeelectronics',
  );

  // Address
  const [addressLine, setAddressLine] = useState(
    userBusiness?.addressLine || 'Plot 42, Phase II, GIDC Industrial Estate',
  );
  const [area, setArea] = useState(userBusiness?.area || 'Naroda Industrial Zone');
  const [city, setCity] = useState(userBusiness?.city || 'Ahmedabad');
  const [state, setState] = useState(userBusiness?.state || 'Gujarat');
  const [pinCode, setPinCode] = useState(userBusiness?.pinCode || '382330');
  const [country, setCountry] = useState(userBusiness?.country || 'India');
  const [mapUrl, setMapUrl] = useState(
    userBusiness?.mapUrl || 'https://maps.google.com/?q=Naroda+GIDC+Ahmedabad',
  );

  // Operating Info
  const [openingHours, setOpeningHours] = useState(
    userBusiness?.openingHours || 'Mon - Sat: 9:00 AM - 7:30 PM',
  );
  const [availabilityStatus, setAvailabilityStatus] = useState(
    userBusiness?.availabilityStatus || 'Immediate Dispatch Available',
  );
  const [priceRange, setPriceRange] = useState(
    userBusiness?.priceRange || '₹₹ (Wholesale / Bulk Commercial)',
  );

  // Pick Logo / Avatar
  const handlePickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setAvatar(res.assets[0].uri);
        showToast('Logo updated!', 'info');
      }
    } catch {
      // Ignored
    }
  };

  // Pick Cover
  const handlePickCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setCoverImage(res.assets[0].uri);
        showToast('Cover image updated!', 'info');
      }
    } catch {
      // Ignored
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Business name cannot be empty.');
      return;
    }

    const fullAddr = `${addressLine.trim()}, ${area.trim()}, ${city.trim()}, ${state.trim()} - ${pinCode.trim()}`;

    updateBusinessProfile({
      name: name.trim(),
      category: category.trim(),
      about: about.trim(),
      avatar: avatar || userBusiness?.avatar,
      coverImage: coverImage || userBusiness?.coverImage,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      instagram: instagram.trim(),
      website: website.trim(),
      facebook: facebook.trim(),
      youtube: youtube.trim(),
      addressLine: addressLine.trim(),
      area: area.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      country: country.trim(),
      fullAddress: fullAddr,
      mapUrl: mapUrl.trim(),
      openingHours: openingHours.trim(),
      availabilityStatus: availabilityStatus.trim(),
      priceRange: priceRange.trim(),
      profileCompletion: 95,
    });

    navigate('business_hub');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screenWrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('business_hub')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Edit Business Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveTopBtn}>
          <Text style={styles.saveTopBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        {[
          { key: 'basic', label: '1. Basic' },
          { key: 'social', label: '2. Social & Web' },
          { key: 'address', label: '3. Address' },
          { key: 'hours', label: '4. Operations' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[styles.sectionTabItem, isActive && styles.sectionTabItemActive]}
            >
              <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* TAB 1: BASIC DETAILS */}
        {activeTab === 'basic' && (
          <View style={styles.formSection}>
            {/* Visual Logo & Cover preview */}
            <View style={styles.mediaPreviewCard}>
              <View style={styles.coverPreviewContainer}>
                <Image
                  source={{ uri: coverImage || userBusiness?.coverImage }}
                  style={styles.coverImg}
                />
                <TouchableOpacity style={styles.changeCoverBtn} onPress={handlePickCover}>
                  <Feather name="camera" size={13} color="#FFFFFF" />
                  <Text style={styles.changeBtnText}>Change Cover</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.logoRow}>
                <Image source={{ uri: avatar || userBusiness?.avatar }} style={styles.logoImg} />
                <TouchableOpacity style={styles.changeLogoBtn} onPress={handlePickLogo}>
                  <Feather name="upload" size={13} color={colors.primary} />
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
                  placeholder="+91 98795 23410"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Official Business Email *</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="sales@yourdomain.in"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* TAB 2: SOCIAL & WEBSITE */}
        {activeTab === 'social' && (
          <View style={styles.formSection}>
            <View style={styles.noticeBox}>
              <Feather name="instagram" size={16} color="#A3238E" />
              <Text style={styles.noticeText}>
                Your Instagram handle will appear as an active, clickable link on your public
                business page.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Instagram Handle / URL *</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="instagram" size={16} color="#A3238E" style={styles.fieldIcon} />
                <TextInput
                  style={styles.iconInput}
                  value={instagram}
                  onChangeText={setInstagram}
                  placeholder="@yourbusiness or https://instagram.com/..."
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Official Website URL</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="globe" size={16} color="#00AEEF" style={styles.fieldIcon} />
                <TextInput
                  style={styles.iconInput}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://yourcompany.in"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Facebook Page URL (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="facebook" size={16} color="#3B82F6" style={styles.fieldIcon} />
                <TextInput
                  style={styles.iconInput}
                  value={facebook}
                  onChangeText={setFacebook}
                  placeholder="https://facebook.com/yourpage"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>YouTube Channel URL (Optional)</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="youtube" size={16} color="#EF4444" style={styles.fieldIcon} />
                <TextInput
                  style={styles.iconInput}
                  value={youtube}
                  onChangeText={setYoutube}
                  placeholder="https://youtube.com/@yourchannel"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: BUSINESS ADDRESS */}
        {activeTab === 'address' && (
          <View style={styles.formSection}>
            <View style={styles.noticeBox}>
              <Feather name="map-pin" size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Your full address will have a direct "Get Directions" action button on the public
                profile.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address Line / Unit No. *</Text>
              <TextInput
                style={styles.textInput}
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Plot 42, Phase II, GIDC Industrial Estate"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Area / Locality / Sector</Text>
              <TextInput
                style={styles.textInput}
                value={area}
                onChangeText={setArea}
                placeholder="Naroda Industrial Zone"
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
              <Text style={styles.fieldLabel}>Google Maps Location URL (For Get Directions)</Text>
              <TextInput
                style={styles.textInput}
                value={mapUrl}
                onChangeText={setMapUrl}
                placeholder="https://maps.google.com/?q=..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        {/* TAB 4: OPERATING INFO */}
        {activeTab === 'hours' && (
          <View style={styles.formSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Working Hours *</Text>
              <TextInput
                style={styles.textInput}
                value={openingHours}
                onChangeText={setOpeningHours}
                placeholder="e.g. Mon - Sat: 9:00 AM - 7:30 PM (Sun Closed)"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Order & Delivery Availability</Text>
              <TextInput
                style={styles.textInput}
                value={availabilityStatus}
                onChangeText={setAvailabilityStatus}
                placeholder="e.g. Immediate Dispatch Available, Made to Order"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Commercial Price Range / Terms</Text>
              <TextInput
                style={styles.textInput}
                value={priceRange}
                onChangeText={setPriceRange}
                placeholder="e.g. ₹₹ (Wholesale / Bulk Contract Pricing)"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        )}

        {/* Bottom Actions */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Feather name="check" size={16} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => {
              if (userBusiness) navigate('business_detail', { businessId: userBusiness.id });
            }}
            activeOpacity={0.8}
          >
            <Feather name="eye" size={14} color={colors.primary} />
            <Text style={styles.previewBtnText}>Preview Public Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  saveTopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveTopBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionTabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    padding: 14,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  mediaPreviewCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverPreviewContainer: {
    height: 110,
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  changeCoverBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  logoImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#E2E8F0',
  },
  changeLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  changeLogoBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDF4FF',
    borderWidth: 1,
    borderColor: '#F5D0FE',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#86198F',
    lineHeight: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  fieldIcon: {
    marginRight: 8,
  },
  iconInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  bottomActionsRow: {
    gap: 10,
    marginBottom: 20,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
  },
  previewBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
