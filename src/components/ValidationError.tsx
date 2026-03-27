import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, font } from '../theme';

interface ValidationErrorProps {
  error: string | null;
}

export default function ValidationError({ error }: ValidationErrorProps) {
  if (!error) return null;
  return (
    <View style={styles.row}>
      <Ionicons name="alert-circle" size={14} color={colors.danger} style={styles.icon} />
      <Text style={styles.error}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  icon: { marginRight: spacing.xs },
  error: {
    color: colors.danger,
    fontSize: font.sm,
    flex: 1,
  },
});
