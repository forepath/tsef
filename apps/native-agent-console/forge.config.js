module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['./server'],
    ignore: [/^\/\.git/, /^\/node_modules\/\.cache/, /^\/\.vscode/, /^\/\.idea/, /^\/\.DS_Store/],
    prune: false,
  },
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip', platforms: ['win32'] },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-zip', platforms: ['linux'] },
    { name: '@electron-forge/maker-deb', config: {} },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
