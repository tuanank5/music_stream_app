const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const tamaguiManifest = require.resolve("tamagui/package.json");
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  // npm may install separate Portal copies below tamagui and dialog. Their
  // React contexts must be identical. Resolve from the provider's package,
  // leaving Metro to select the correct native entry and package conditions.
  if (moduleName === "@tamagui/portal") {
    return resolve({ ...context, originModulePath: tamaguiManifest }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
