const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .wasm files (required for expo-sqlite on web)
config.resolver.assetExts.push('wasm');

// Treat .wasm as asset so Metro serves it correctly
config.transformer = {
  ...config.transformer,
  assetPlugins: config.transformer?.assetPlugins ?? [],
};

module.exports = config;
