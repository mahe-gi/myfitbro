import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { WorkoutStackParamList } from '../navigation/WorkoutStack';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getLastSetWeightForExercise } from '../db/sets';
import { toDisplayWeight, toStorageWeight } from '../utils/units';
import NumericStepper from '../components/NumericStepper';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ValidationError from '../components/ValidationError';
import type { Exercise, WorkoutSet } from '../types/db';

type NavProp = StackNavigationProp<WorkoutStackParamList, 'Workout'>;
type RoutePropType = RouteProp<WorkoutStackParamList, 'Workout'>;

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── ExerciseSelector ────────────────────────────────────────────────────────

interface ExerciseSelectorProps {
  exercise: Exercise | null;
  onChangePress: () => void;
}

function ExerciseSelector({ exercise, onChangePress }: ExerciseSelectorProps) {
  return (
    <View style={styles.exerciseSelector}>
      {exercise ? (
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
        </View>
      ) : (
        <Text style={styles.exercisePlaceholder}>No exercise selected</Text>
      )}
      <TouchableOpacity style={styles.changeBtn} onPress={onChangePress}>
        <Text style={styles.changeBtnText}>Change Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── PRBadge ─────────────────────────────────────────────────────────────────

interface PRBadgeProps {
  prKg: number | null;
  unit: 'kg' | 'lbs';
}

function PRBadge({ prKg, unit }: PRBadgeProps) {
  const label =
    prKg != null
      ? `PR: ${toDisplayWeight(prKg, unit)} ${unit}`
      : 'No PR yet';
  return (
    <View style={styles.prBadge}>
      <Text style={styles.prText}>{label}</Text>
    </View>
  );
}

// ─── SetRow ──────────────────────────────────────────────────────────────────

interface SetRowProps {
  set: WorkoutSet;
  exerciseName: string;
  unit: 'kg' | 'lbs';
  onEdit: (id: number, weight: number, reps: number) => void;
  onDeleteRequest: (id: number, weight: number) => void;
}

function SetRow({ set, exerciseName, unit, onEdit, onDeleteRequest }: SetRowProps) {
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState(toDisplayWeight(set.weight, unit));
  const [editReps, setEditReps] = useState(set.reps);

  const handleSave = () => {
    onEdit(set.id, editWeight, editReps);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.setRowEditing}>
        <Text style={styles.setRowExercise}>{exerciseName}</Text>
        <View style={styles.setRowEditControls}>
          <View style={styles.stepperGroup}>
            <Text style={styles.stepperLabel}>{unit}</Text>
            <NumericStepper
              value={editWeight}
              onChange={setEditWeight}
              min={0.5}
              step={1}
            />
          </View>
          <View style={styles.stepperGroup}>
            <Text style={styles.stepperLabel}>reps</Text>
            <NumericStepper
              value={editReps}
              onChange={setEditReps}
              min={1}
              step={1}
            />
          </View>
        </View>
        <View style={styles.setRowActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.setRow}>
      <View style={styles.setRowInfo}>
        <Text style={styles.setRowExercise}>{exerciseName}</Text>
        <Text style={styles.setRowValues}>
          {toDisplayWeight(set.weight, unit)} {unit} × {set.reps} reps
        </Text>
      </View>
      <View style={styles.setRowActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setEditWeight(toDisplayWeight(set.weight, unit));
            setEditReps(set.reps);
            setEditing(true);
          }}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDeleteRequest(set.id, set.weight)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── WorkoutScreen ────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  const workoutStore = useWorkoutStore();
  const { weightUnit } = useSettingsStore();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [displayWeight, setDisplayWeight] = useState(20);
  const [reps, setReps] = useState(8);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; weight: number } | null>(null);

  // On mount: start session and load exercises
  useEffect(() => {
    workoutStore.startOrGetSession(today());
    workoutStore.loadExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle exercise selected from ExercisePicker
  useEffect(() => {
    const incoming = route.params?.selectedExercise;
    if (incoming) {
      setSelectedExercise(incoming);
    }
  }, [route.params?.selectedExercise]);

  // Pre-fill weight when exercise changes
  useEffect(() => {
    if (!selectedExercise) return;
    getLastSetWeightForExercise(selectedExercise.id).then((lastKg) => {
      if (lastKg != null) {
        setDisplayWeight(toDisplayWeight(lastKg, weightUnit));
      }
    });
  }, [selectedExercise, weightUnit]);

  const handleLogSet = useCallback(() => {
    if (!selectedExercise || !workoutStore.currentSessionId) {
      setValidationError('Please select an exercise first.');
      return;
    }
    setValidationError(null);
    workoutStore.logSet({
      workout_session_id: workoutStore.currentSessionId,
      exercise_id: selectedExercise.id,
      weight: toStorageWeight(displayWeight, weightUnit),
      reps,
    });
  }, [selectedExercise, workoutStore, displayWeight, reps, weightUnit]);

  // Reflect store validation errors
  useEffect(() => {
    if (workoutStore.error) {
      setValidationError(workoutStore.error);
    }
  }, [workoutStore.error]);

  const handleEdit = (id: number, weight: number, editReps: number) => {
    if (!selectedExercise) return;
    workoutStore.editSet(
      id,
      toStorageWeight(weight, weightUnit),
      editReps,
      selectedExercise.id,
    );
  };

  const handleDeleteRequest = (id: number, weight: number) => {
    setDeleteTarget({ id, weight });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget || !selectedExercise) return;
    workoutStore.deleteSet(deleteTarget.id, selectedExercise.id, deleteTarget.weight);
    setDeleteTarget(null);
  };

  const handleNotesBlur = () => {
    // Notes are stored in session — for now just keep in local state
    // (session notes update would require a sessions.updateNotes call, not in scope here)
  };

  const exerciseMap = Object.fromEntries(
    workoutStore.exercises.map((e) => [e.id, e]),
  );

  const prKg = selectedExercise
    ? workoutStore.prs[selectedExercise.id]?.max_weight ?? null
    : null;

  const hasSets = workoutStore.sets.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.flex}>
          {/* Exercise selector + PR */}
          <ExerciseSelector
            exercise={selectedExercise}
            onChangePress={() => navigation.navigate('ExercisePicker')}
          />
          {selectedExercise && (
            <PRBadge prKg={prKg} unit={weightUnit} />
          )}

          {/* Progressive overload banner */}
          {workoutStore.suggestion && (
            <View style={styles.overloadBanner}>
              <Text style={styles.overloadText}>{workoutStore.suggestion.message}</Text>
            </View>
          )}

          {/* Set list or empty state */}
          {hasSets ? (
            <FlatList
              data={workoutStore.sets}
              keyExtractor={(item) => String(item.id)}
              style={styles.setList}
              renderItem={({ item }) => (
                <SetRow
                  set={item}
                  exerciseName={exerciseMap[item.exercise_id]?.name ?? 'Unknown'}
                  unit={weightUnit}
                  onEdit={handleEdit}
                  onDeleteRequest={handleDeleteRequest}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <EmptyState
              message="No sets logged yet. Select an exercise and log your first set!"
              onPress={() => navigation.navigate('ExercisePicker')}
              buttonLabel="Pick Exercise"
            />
          )}

          {/* Notes input */}
          <TextInput
            style={styles.notesInput}
            placeholder="Session notes (optional)…"
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            multiline
          />
        </View>

        {/* Fixed bottom: input row + log button */}
        <View style={styles.inputArea}>
          <View style={styles.stepperRow}>
            <View style={styles.stepperGroup}>
              <Text style={styles.stepperLabel}>Weight ({weightUnit})</Text>
              <NumericStepper
                value={displayWeight}
                onChange={setDisplayWeight}
                min={0.5}
                step={1}
              />
            </View>
            <View style={styles.stepperGroup}>
              <Text style={styles.stepperLabel}>Reps</Text>
              <NumericStepper
                value={reps}
                onChange={setReps}
                min={1}
                step={1}
              />
            </View>
          </View>
          <ValidationError error={validationError} />
          <TouchableOpacity style={styles.logBtn} onPress={handleLogSet}>
            <Text style={styles.logBtnText}>Log Set</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        visible={deleteTarget != null}
        message="Delete this set? This cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // Exercise selector
  exerciseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 17, fontWeight: '600', color: '#111' },
  exerciseMuscle: { fontSize: 13, color: '#888', marginTop: 2 },
  exercisePlaceholder: { fontSize: 15, color: '#aaa', flex: 1 },
  changeBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  changeBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // PR badge
  prBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prText: { fontSize: 13, color: '#856404', fontWeight: '600' },

  // Overload banner
  overloadBanner: {
    margin: 12,
    padding: 12,
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
  },
  overloadText: { color: '#155724', fontSize: 14 },

  // Set list
  setList: { flex: 1 },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },

  // Set row (view mode)
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  setRowInfo: { flex: 1 },
  setRowExercise: { fontSize: 14, fontWeight: '600', color: '#333' },
  setRowValues: { fontSize: 14, color: '#555', marginTop: 2 },
  setRowActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F0FE',
    borderRadius: 6,
  },
  editBtnText: { color: '#1A73E8', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FDECEA',
    borderRadius: 6,
  },
  deleteBtnText: { color: '#D93025', fontWeight: '600', fontSize: 13 },

  // Set row (edit mode)
  setRowEditing: {
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  setRowEditControls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#34A853',
    borderRadius: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  cancelBtnText: { color: '#333', fontWeight: '600', fontSize: 13 },

  // Notes
  notesInput: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    minHeight: 48,
    maxHeight: 80,
  },

  // Bottom input area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
    backgroundColor: '#fff',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stepperGroup: { alignItems: 'center', gap: 4 },
  stepperLabel: { fontSize: 13, color: '#555', marginBottom: 4 },
  logBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
