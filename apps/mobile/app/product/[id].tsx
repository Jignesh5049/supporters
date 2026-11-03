import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { ProductDetailScreen } from '../../src/screens/ProductDetailScreen';

export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { navigate } = useApp();

  useEffect(() => {
    if (id) {
      navigate('product_detail', { productId: id });
    }
  }, [id]);

  return <ProductDetailScreen />;
}
