import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface BrandEmblemProps {
  size?: number;
}

/**
 * Geometric Hexagonal Emblem inspired directly by the reference UI:
 * Features a modern split design with dotted matrix on the left and
 * energetic wavy lines on the right, encased in a glowing violet frame.
 */
export default function BrandEmblem({ size = 84 }: BrandEmblemProps) {
  const scale = size / 84;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Hexagon / Shield Ring */}
      <View style={[styles.shieldOuter, { transform: [{ scale }] }]}>
        {/* Left Side: Dot Matrix Pattern */}
        <View style={styles.leftHalf}>
          <View style={styles.dotRow}><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /></View>
        </View>

        {/* Center Diagonal Divider */}
        <View style={styles.divider} />

        {/* Right Side: Wavy Stream Lines */}
        <View style={styles.rightHalf}>
          <View style={styles.waveBar} />
          <View style={[styles.waveBar, styles.waveBarTilted]} />
          <View style={styles.waveBar} />
          <View style={[styles.waveBar, styles.waveBarTilted]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldOuter: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#FA2E67',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  leftHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  divider: {
    width: 2,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
    transform: [{ rotate: '12deg' }],
  },
  rightHalf: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: '75%',
  },
  waveBar: {
    width: 3.5,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  waveBarTilted: {
    height: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ scaleY: 0.95 }],
  },
});
