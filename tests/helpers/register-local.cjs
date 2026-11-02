const Module = require("node:module");
const fs = require("node:fs");
const ts = require("typescript");
const load = Module._load;
// Only the platform discriminator is needed for service-level tests.
Module._load = function (request, parent, isMain) {
  if (request === "react-native") return { Platform: { OS: "web" } };
  return load.call(this, request, parent, isMain);
};
function register(module, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  module._compile(outputText, filename);
}
require.extensions[".ts"] = register;
require.extensions[".tsx"] = register;
