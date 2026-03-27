module.exports = (api) => {
  const isTest = api.env('test');

  if (isTest) {
    return {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    };
  }

  return {
    presets: ['babel-preset-expo'],
  };
};
