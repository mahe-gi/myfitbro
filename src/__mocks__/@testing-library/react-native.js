const React = require('react');

// Recursively find all elements matching a predicate
function findAll(el, predicate) {
  if (!el || typeof el !== 'object') return [];
  const results = [];
  if (predicate(el)) results.push(el);
  const children = el.props && el.props.children
    ? (Array.isArray(el.props.children) ? el.props.children : [el.props.children])
    : [];
  for (const child of children) {
    results.push(...findAll(child, predicate));
  }
  return results;
}

// Check if an element's subtree contains the given text string
function subtreeHasText(el, text) {
  if (!el) return false;
  if (typeof el === 'string') return el === text;
  if (typeof el !== 'object') return false;
  const children = el.props && el.props.children
    ? (Array.isArray(el.props.children) ? el.props.children : [el.props.children])
    : [];
  return children.some(c => subtreeHasText(c, text));
}

// Find the deepest element that directly contains the text as a child string
function findElementWithText(el, text) {
  if (!el || typeof el !== 'object') return null;
  const children = el.props && el.props.children
    ? (Array.isArray(el.props.children) ? el.props.children : [el.props.children])
    : [];

  // Check if this element directly contains the text string as a child
  if (children.some(c => c === text)) {
    return el;
  }

  // Recurse into children
  for (const child of children) {
    const found = findElementWithText(child, text);
    if (found) return found;
  }
  return null;
}

// Find the nearest ancestor with onPress that contains the text
function findPressableWithText(el, text) {
  if (!el || typeof el !== 'object') return null;
  const children = el.props && el.props.children
    ? (Array.isArray(el.props.children) ? el.props.children : [el.props.children])
    : [];

  // If this element has onPress and contains the text in its subtree
  if (el.props && el.props.onPress && subtreeHasText(el, text)) {
    return el;
  }

  for (const child of children) {
    const found = findPressableWithText(child, text);
    if (found) return found;
  }
  return null;
}

function renderElement(element) {
  if (!element) return null;
  if (typeof element.type === 'function') {
    try {
      return element.type(element.props);
    } catch (e) {
      return element;
    }
  }
  return element;
}

function render(element) {
  const rendered = renderElement(element);

  return {
    getByText: (text) => {
      // First try to find a pressable containing the text (for fireEvent.press)
      const pressable = findPressableWithText(rendered, text);
      if (pressable) return pressable;

      // Otherwise find the element directly containing the text
      const found = findElementWithText(rendered, text);
      if (!found) throw new Error(`Unable to find element with text: "${text}"`);
      return found;
    },
  };
}

const fireEvent = {
  press: (element) => {
    if (element && element.props && element.props.onPress) {
      element.props.onPress();
    }
  },
};

module.exports = { render, fireEvent };
