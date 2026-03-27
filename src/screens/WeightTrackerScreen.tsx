import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWeightStore } from '../stores/weightStore';
import { useSettingsStore } from '../stores/settingsStore';
import { validateWeightEntry } from '../utils/validation';
import { toDisplayWeight, toStorageWeight } from '../utils/units';
import ValidationError from '../components/ValidationError';
import EmptyState from '../components/EmptyState';
import type { WeightEntry } from '../types/db';
import { colors, spacing, radius, font, shadow } from '../theme';

function WeightInputRow({
  inputValue, onChangeText, onLog, unit, validationError,
}: {
  inputValue: string;
  onChangeText: (v: string) => void;
  onLog: () => void;
  unit: string;
  validationError: string | null;
}) {
  return (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>Log today's weight</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.0"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.unitLabel}>{unit}</Text>
        <Pressable style={styles.logButton} onPress={onLog}>
          <Ionicons name="checkmark" size={18} color={colors.textInverse} />
          <Text style={styles.logButtonText}>Log</Text>
        </Pressable>
      </View>
      <ValidationError error={validationError} />
    </View>
  );
}

function WeightHistoryList({ history, unit }: { history: WeightEntry[]; unit: string }) {
  const renderItem = ({ item, index }: { item: WeightEntry; index: number }) => {
    const prev = history[index + 1];
    const diff = prev ? item.value - prev.value : null;
    const diffDisplay = diff != null ? toDisplayWeight(Math.abs(diff), unit as 'kg' | 'lbs') : null;

    return (
      <View style={styles.historyRow}>
        <View>
          <Text style={styles.historyDate}>{item.date}</Text>
        </View>
        <View style={styles.historyRight}>
          {diffDisplay != null && (
            <View style={[styles.diffBadge, { backgroundColor: diff! > 0 ? colors.dangerLight : colors.successLight }]}>
              <Ionicons
                name={diff! > 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={diff! > 0 ? colors.danger : colors.success}
              />
              <Text style={[styles.diffText, { color: diff! > 0 ? colors.danger : colors.success }]}>
                {diffDisplay}
              </Text>
            </View>
          )}
          <Text style={styles.historyValue}>
            {toDisplayWeight(item.value, unit as 'kg' | 'lbs')} {unit}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.date}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
    />
  );
}

export default function WeightTrackerScreen() {
  const weightStore = useWeightStore();
  const { weightUnit } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => { weightStore.loadHistory(); }, []);

  const handleLog = () => {
    const display = parseFloat(inputValue);
    const storage = toStorageWeight(display, weightUnit);
    const result = validateWeightEntry(storage);
    if (!result.valid) { setValidationError(result.error); return; }
    setValidationError(null);
    weightStore.logWeight(new Date().toISOString().split('T')[0], storage);
    setInputValue('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <WeightInputRow
        inputValue={inputValue}
        onChangeText={setInputValue}
        onLog={handleLog}
        unit={weightUnit}
        validationError={validationError}
      />
      {weightStore.history.length === 0 ? (
        <EmptyState
          icon="scale-outline"
          message="No weight entries yet. Log your first entry above."
          onPress={handleLog}
          buttonLabel="Log Weight"
        />
      ) : (
        <WeightHistoryList history={weightStore.history} unit={weightUnit} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inputSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.card,
  },
  inputLabel: {
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.lg,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  unitLabel: { fontSize: font.md, color: colors.textSecondary, minWidth: 28 },
  logButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logButtonText: { color: colors.textInverse, fontSize: font.md, fontWeight: '600' },
  listContent: { padding: spacing.md },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    marginBottom: 1,
  },
  historyDate: { fontSize: font.md, color: colors.text, fontWeight: '500' },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  diffText: { fontSize: 11, fontWeight: '600' },
  historyValue: { fontSize: font.md, fontWeight: '700', color: colors.primary },
});
