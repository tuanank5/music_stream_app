const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const tamaguiManifest = require.resolve("tamagui/package.json");
const defaultResolveRequest = config.resolver.resolveRequest;

if (process.platform === "win32") {
  config.maxWorkers = Math.min(config.maxWorkers ?? 2, 2);
  const { limitCacheConcurrency } = require("./tools/metro-cache.cjs");
  const stores = config.cacheStores;
  config.cacheStores =
    typeof stores === "function"
      ? (...args) => limitCacheConcurrency(stores(...args))
      : limitCacheConcurrency(stores ?? []);
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest ?? context.resolveRequest;
  // npm may install separate Portal copies below tamagui and dialog. Their
  // React contexts must be identical. Resolve from the provider's package,
  // leaving Metro to select the correct native entry and package conditions.
  if (moduleName === "@tamagui/portal") {
    return resolve(
      { ...context, originModulePath: tamaguiManifest },
      moduleName,
      platform,
    );
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
