import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { BusinessDetailScreen } from '../../src/screens/BusinessDetailScreen';

export default function BusinessRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { navigate } = useApp();

  useEffect(() => {
    if (slug) {
      navigate('business_detail', { businessId: slug });
    }
  }, [slug]);

  return <BusinessDetailScreen />;
}
