const path = require("node:path");

module.exports = {
  packagerConfig: {
    name: "LeadJa",
    executableName: "LeadJa",
    appBundleId: "br.com.talhetti.leadja",
    appCategoryType: "public.app-category.business",
    icon: path.join(__dirname, "resources", "icon"),
    extendInfo: {
      NSCameraUsageDescription: "O WhatsApp Web usa a câmera quando você inicia uma chamada ou captura uma imagem.",
      NSMicrophoneUsageDescription: "O WhatsApp Web usa o microfone quando você grava uma mensagem de voz ou inicia uma chamada.",
    },
    osxSign: {
      identity: "-",
      identityValidation: false,
      optionsForFile: () => ({
        entitlements: path.join(__dirname, "resources", "entitlements.mac.plist"),
      }),
    },
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
