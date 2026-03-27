import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useFoodStore } from '../stores/foodStore';
import { validateRecipe } from '../utils/validation';
import ValidationError from '../components/ValidationError';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Recipe, MealCategory } from '../types/db';
import type { FoodStackParamList } from '../navigation/FoodStack';

type Props = StackScreenProps<FoodStackParamList, 'RecipeManager'>;

interface RecipeFormState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_FORM: RecipeFormState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
};

function RecipeForm({
  initial,
  onSave,
  onCancel,
  error,
}: {
  initial?: RecipeFormState;
  onSave: (form: RecipeFormState) => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [form, setForm] = useState<RecipeFormState>(initial ?? EMPTY_FORM);

  const set = (field: keyof RecipeFormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  return (
    <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
      <Text style={styles.formTitle}>{initial ? 'Edit Recipe' : 'New Recipe'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Recipe name"
        value={form.name}
        onChangeText={set('name')}
      />
      <TextInput
        style={styles.input}
        placeholder="Calories"
        value={form.calories}
        onChangeText={set('calories')}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Protein (g)"
        value={form.protein}
        onChangeText={set('protein')}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Carbs (g)"
        value={form.carbs}
        onChangeText={set('carbs')}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Fat (g)"
        value={form.fat}
        onChangeText={set('fat')}
        keyboardType="decimal-pad"
      />
      <ValidationError error={error} />
      <View style={styles.formButtons}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={() => onSave(form)}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function RecipeManagerScreen({ route, navigation }: Props) {
  const pickerMode = route.params?.pickerMode ?? false;
  const mealCategory = route.params?.mealCategory;
  const foodStore = useFoodStore();

  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    foodStore.loadRecipes();
  }, []);

  const handleSave = async (form: RecipeFormState) => {
    const data = {
      name: form.name.trim(),
      calories: parseInt(form.calories, 10) || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
    };
    const result = validateRecipe(data);
    if (!result.valid) {
      setFormError(result.error);
      return;
    }
    setFormError(null);
    if (editingRecipe) {
      await foodStore.updateRecipe(editingRecipe.id, data);
    } else {
      await foodStore.createRecipe(data);
    }
    if (foodStore.error) {
      setFormError(foodStore.error);
      return;
    }
    setShowForm(false);
    setEditingRecipe(null);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormError(null);
    setShowForm(true);
  };

  const handleDeletePress = (recipe: Recipe) => {
    setDeleteTarget(recipe);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await foodStore.deleteRecipe(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handlePickRecipe = async (recipe: Recipe) => {
    if (!mealCategory) return;
    await foodStore.addFoodLog({ date: today, recipe_id: recipe.id, meal_category: mealCategory });
    navigation.goBack();
  };

  const renderRecipeRow = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeRow}>
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.recipeMacros}>
          {item.calories} kcal · P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
        </Text>
      </View>
      {pickerMode ? (
        <Pressable style={styles.addButton} onPress={() => handlePickRecipe(item)}>
          <Text style={styles.addButtonText}>Add to Log</Text>
        </Pressable>
      ) : (
        <View style={styles.rowActions}>
          <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => handleDeletePress(item)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (showForm) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RecipeForm
          initial={
            editingRecipe
              ? {
                  name: editingRecipe.name,
                  calories: String(editingRecipe.calories),
                  protein: String(editingRecipe.protein),
                  carbs: String(editingRecipe.carbs),
                  fat: String(editingRecipe.fat),
                }
              : undefined
          }
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingRecipe(null);
            setFormError(null);
          }}
          error={formError}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {!pickerMode && (
        <Pressable
          style={styles.newRecipeButton}
          onPress={() => {
            setEditingRecipe(null);
            setFormError(null);
            setShowForm(true);
          }}
        >
          <Text style={styles.newRecipeButtonText}>+ New Recipe</Text>
        </Pressable>
      )}

      {foodStore.recipes.length === 0 ? (
        <EmptyState
          message="No recipes yet. Create your first recipe to get started."
          onPress={() => {
            setEditingRecipe(null);
            setFormError(null);
            setShowForm(true);
          }}
          buttonLabel="Create Recipe"
        />
      ) : (
        <FlatList
          data={foodStore.recipes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRecipeRow}
          contentContainerStyle={styles.listContent}
        />
      )}

      <ConfirmDialog
        visible={deleteTarget !== null}
        message={`Delete "${deleteTarget?.name}"?\n\nThis recipe may be used in your food log. Deleting it will also remove those entries.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  newRecipeButton: {
    margin: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  newRecipeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recipeMacros: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#fdecea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
