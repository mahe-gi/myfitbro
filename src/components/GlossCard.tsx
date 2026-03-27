import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, shadow, gloss } from '../theme';

interface GlossCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
}

/**
 * Dark glossy card with a subtle top-edge sheen and optional orange glow.
 */
export default function GlossCard({ children, style, glow = false }: GlossCardProps) {
  return (
    <View style={[styles.card, glow && shadow.glow, style]}>
      {/* top gloss sheen */}
      <View style={styles.sheen} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: gloss.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  // thin bright strip at the top simulates a light reflection
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: gloss.overlayStrong,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
});
