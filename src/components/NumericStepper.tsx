import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  step: number;
}

export default function NumericStepper({ value, onChange, min, step }: NumericStepperProps) {
  const decrement = () => onChange(Math.max(value - step, min));
  const increment = () => onChange(value + step);

  const handleTextChange = (text: string) => {
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) onChange(Math.max(parsed, min));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={decrement} style={styles.btn} activeOpacity={0.7}>
        <Ionicons name="remove" size={20} color={colors.primary} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={String(value)}
        onChangeText={handleTextChange}
        keyboardType="numeric"
        selectTextOnFocus
      />
      <TouchableOpacity onPress={increment} style={styles.btn} activeOpacity={0.7}>
        <Ionicons name="add" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  btn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  input: {
    width: 56,
    height: 38,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
});
