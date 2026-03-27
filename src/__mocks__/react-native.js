const React = require('react');

const View = ({ children, style, ...props }) => React.createElement('View', { style, ...props }, children);
const Text = ({ children, style, ...props }) => React.createElement('Text', { style, ...props }, children);
const Pressable = ({ children, onPress, style, ...props }) =>
  React.createElement('Pressable', { onPress, style, ...props }, children);
const StyleSheet = {
  create: (styles) => styles,
};
const Platform = { OS: 'ios' };

module.exports = {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
};
