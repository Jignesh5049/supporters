import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  EditBusinessBasicTab,
  EditBusinessSocialTab,
  EditBusinessAddressTab,
  EditBusinessOperationsTab,
} from '../features/hub/components';

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
        <TouchableOpacity
          onPress={() => navigate('business_hub')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
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
        {activeTab === 'basic' && (
          <EditBusinessBasicTab
            coverImage={coverImage || userBusiness?.coverImage}
            avatar={avatar || userBusiness?.avatar}
            name={name}
            setName={setName}
            category={category}
            setCategory={setCategory}
            about={about}
            setAbout={setAbout}
            contactPerson={contactPerson}
            setContactPerson={setContactPerson}
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            onPickCover={handlePickCover}
            onPickLogo={handlePickLogo}
          />
        )}

        {activeTab === 'social' && (
          <EditBusinessSocialTab
            instagram={instagram}
            setInstagram={setInstagram}
            website={website}
            setWebsite={setWebsite}
            facebook={facebook}
            setFacebook={setFacebook}
            youtube={youtube}
            setYoutube={setYoutube}
          />
        )}

        {activeTab === 'address' && (
          <EditBusinessAddressTab
            addressLine={addressLine}
            setAddressLine={setAddressLine}
            area={area}
            setArea={setArea}
            city={city}
            setCity={setCity}
            state={state}
            setState={setState}
            pinCode={pinCode}
            setPinCode={setPinCode}
            country={country}
            setCountry={setCountry}
            mapUrl={mapUrl}
            setMapUrl={setMapUrl}
          />
        )}

        {activeTab === 'hours' && (
          <EditBusinessOperationsTab
            openingHours={openingHours}
            setOpeningHours={setOpeningHours}
            availabilityStatus={availabilityStatus}
            setAvailabilityStatus={setAvailabilityStatus}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveTopBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionTabItemActive: {
    borderBottomColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  sectionTabText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
});
