import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface BrandEmblemProps {
  size?: number;
}

/**
 * Geometric brand emblem: dot matrix (left) + signal waves (right),
 * split by a diagonal divider inside a rounded blue-tinted tile.
 */
export default function BrandEmblem({ size = 84 }: BrandEmblemProps) {
  const scale = size / 84;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.tile, { transform: [{ scale }] }]}>
        <View style={styles.leftHalf}>
          <View style={styles.dotRow}><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /><View style={styles.dot} /></View>
          <View style={styles.dotRow}><View style={styles.dot} /></View>
        </View>

        <View style={styles.divider} />

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
  tile: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.tintBlue,
    borderWidth: 1.5,
    borderColor: Colors.tintBlueStrong,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
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
    backgroundColor: Colors.primary,
  },
  divider: {
    width: 2,
    height: '80%',
    backgroundColor: Colors.accentLavender,
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
    backgroundColor: Colors.primaryLight,
  },
  waveBarTilted: {
    height: '85%',
    backgroundColor: Colors.accentLavender,
    transform: [{ scaleY: 0.95 }],
  },
});
