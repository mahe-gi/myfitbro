import { describe, it, expect, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmptyState from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders the message text', () => {
    const { getByText } = render(
      React.createElement(EmptyState, {
        message: 'No items found',
        onPress: () => {},
      })
    );
    expect(getByText('No items found')).toBeTruthy();
  });

  it('renders the default button label when none provided', () => {
    const { getByText } = render(
      React.createElement(EmptyState, {
        message: 'Nothing here',
        onPress: () => {},
      })
    );
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('renders a custom button label', () => {
    const { getByText } = render(
      React.createElement(EmptyState, {
        message: 'No recipes yet',
        onPress: () => {},
        buttonLabel: 'Create Recipe',
      })
    );
    expect(getByText('Create Recipe')).toBeTruthy();
  });

  it('calls onPress when the button is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      React.createElement(EmptyState, {
        message: 'No meals logged',
        onPress,
        buttonLabel: 'Add Meal',
      })
    );
    fireEvent.press(getByText('Add Meal'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
