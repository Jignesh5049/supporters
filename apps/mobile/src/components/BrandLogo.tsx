import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../styles/theme';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitleText?: string;
}

export function BrandLogo({
  size = 'md',
  showSubtitle = true,
  subtitleText = 'Social Commerce & B2B Network',
}: BrandLogoProps) {
  const iconBoxSize = size === 'lg' ? 56 : size === 'md' ? 46 : 32;
  const iconSize = size === 'lg' ? 28 : size === 'md' ? 22 : 16;
  const titleFontSize = size === 'lg' ? 26 : size === 'md' ? 22 : 18;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBox,
          {
            width: iconBoxSize,
            height: iconBoxSize,
            borderRadius: iconBoxSize * 0.3,
          },
        ]}
      >
        <ShieldCheck size={iconSize} color={colors.accentCyan} />
      </View>
      <View style={styles.textColumn}>
        <Text style={[styles.brandName, { fontSize: titleFontSize }]}>Supporters</Text>
        {showSubtitle && <Text style={styles.subtitle}>{subtitleText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  textColumn: {
    alignItems: 'center',
  },
  brandName: {
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});
