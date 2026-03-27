import React, { useEffect } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores/settingsStore';
import { exportAllData, importAllData, DatabaseError } from '../db/backup';
import type { WeightUnit } from '../types/db';
import { colors, spacing, radius, font } from '../theme';
import GlossCard from '../components/GlossCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function SectionCard({ children }: { children: React.ReactNode }) {
  return <GlossCard style={styles.card}>{children}</GlossCard>;
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ActionRow({
  icon, iconBg, iconColor, label, sublabel, onPress, tint,
}: {
  icon: IoniconsName;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress} android_ripple={{ color: colors.borderLight }}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.actionBody}>
        <Text style={[styles.actionLabel, tint ? { color: tint } : null]}>{label}</Text>
        {sublabel ? <Text style={styles.actionSub}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function WeightUnitToggle({ selected, onSelect }: { selected: WeightUnit; onSelect: (u: WeightUnit) => void }) {
  return (
    <SectionCard>
      <SectionTitle label="Weight Unit" />
      <View style={styles.toggleRow}>
        {(['kg', 'lbs'] as WeightUnit[]).map((unit) => (
          <Pressable
            key={unit}
            style={[styles.toggleOption, selected === unit && styles.toggleOptionSelected]}
            onPress={() => onSelect(unit)}
          >
            <Ionicons
              name={selected === unit ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={selected === unit ? colors.textInverse : colors.textTertiary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.toggleText, selected === unit && styles.toggleTextSelected]}>{unit}</Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

function BackupSection() {
  const handleBackup = async () => {
    try {
      const payload = await exportAllData();
      const date = new Date().toISOString().split('T')[0];
      const uri = FileSystem.documentDirectory + `fitness_backup_${date}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload));
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Backup Failed', e instanceof Error ? e.message : 'An error occurred');
    }
  };

  const handleRestore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      await importAllData(JSON.parse(content));
      Alert.alert('Restore Complete', 'Your data has been restored successfully.');
    } catch (e) {
      if (e instanceof DatabaseError) Alert.alert('Restore Failed', e.message);
      else if (e instanceof SyntaxError) Alert.alert('Restore Failed', 'The selected file is not valid JSON.');
      else Alert.alert('Restore Failed', e instanceof Error ? e.message : 'An error occurred');
    }
  };

  return (
    <SectionCard>
      <SectionTitle label="Data" />
      <ActionRow
        icon="cloud-upload-outline"
        iconBg={colors.primaryLight}
        iconColor={colors.primary}
        label="Export Backup"
        sublabel="Save your data as a JSON file"
        onPress={handleBackup}
      />
      <View style={styles.divider} />
      <ActionRow
        icon="cloud-download-outline"
        iconBg={colors.successLight}
        iconColor={colors.success}
        label="Import Backup"
        sublabel="Restore from a JSON backup file"
        onPress={handleRestore}
      />
    </SectionCard>
  );
}

export default function SettingsScreen() {
  const { weightUnit, loadSettings, setWeightUnit } = useSettingsStore();
  const insets = useSafeAreaInsets();
  useEffect(() => { loadSettings(); }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <WeightUnitToggle selected={weightUnit} onSelect={setWeightUnit} />
      <BackupSection />
      <Text style={styles.watermark}>Developed by MaheTechSystems</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, gap: spacing.md },
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  toggleOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: font.md, color: colors.text, fontWeight: '600' },
  toggleTextSelected: { color: colors.textInverse },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBody: { flex: 1 },
  actionLabel: { fontSize: font.md, fontWeight: '600', color: colors.text },
  actionSub: { fontSize: font.sm, color: colors.textTertiary, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
  watermark: {
    textAlign: 'center',
    fontSize: font.sm,
    color: colors.textTertiary,
    paddingVertical: spacing.lg,
  },
});
