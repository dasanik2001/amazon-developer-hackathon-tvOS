import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme/colors';

interface BrandEmblemProps {
  size?: number;
}

/**
 * Modern, Professional, Light Brand Emblem for Family TV Guardian.
 * Features a crisp Fire TV Smart Remote with upward broadcast intelligence waves.
 */
export default function BrandEmblem({ size = 88 }: BrandEmblemProps) {
  const borderRadius = Math.round(size * 0.22);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.tileShadow,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
      >
        <Image
          source={require('../../assets/application.png')}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius,
            },
          ]}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel="Family TV Guardian Modern Light Emblem"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileShadow: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
