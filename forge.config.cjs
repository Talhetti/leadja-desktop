const path = require("node:path");

module.exports = {
  packagerConfig: {
    name: "LeadJa",
    executableName: "LeadJa",
    appBundleId: "br.com.talhetti.leadja",
    appCategoryType: "public.app-category.business",
    icon: path.join(__dirname, "resources", "icon"),
    asar: true,
    extraResource: [path.join(__dirname, "resources", "bin")],
    ignore: [
      /^\/.git($|\/)/,
      /^\/.github($|\/)/,
      /^\/.leadja($|\/)/,
      /^\/.taste-skill($|\/)/,
      /^\/out($|\/)/,
      /^\/test($|\/)/,
      /^\/resources($|\/)/,
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      config: {
        name: "LeadJa",
        format: "ULFO",
      },
    },
  ],
};
