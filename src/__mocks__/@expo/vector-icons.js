const React = require('react');
const { Text } = require('react-native');

// Mock all named icon sets as simple Text components
const createMockIcon = (name) => {
  const MockIcon = ({ testID, ...props }) =>
    React.createElement(Text, { testID: testID ?? name, ...props }, props.name ?? name);
  MockIcon.displayName = name;
  return MockIcon;
};

module.exports = new Proxy(
  {},
  {
    get: (_, prop) => createMockIcon(prop),
  },
);
