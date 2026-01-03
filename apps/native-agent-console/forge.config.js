const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['./server'],
    ignore: [/^\/\.git/, /^\/node_modules\/\.cache/, /^\/\.vscode/, /^\/\.idea/, /^\/\.DS_Store/],
    prune: false,
  },
  makers: [
    ...(isWindows
      ? [
          {
            name: '@electron-forge/maker-squirrel',
            config: { name: 'agenstra', exe: 'agenstra_installer.exe' },
          },
          { name: '@electron-forge/maker-zip', platforms: ['win32'] },
        ]
      : []),
    ...(isMac ? [{ name: '@electron-forge/maker-zip', platforms: ['darwin'] }] : []),
    ...(isLinux
      ? [
          { name: '@electron-forge/maker-zip', platforms: ['linux'] },
          {
            name: '@electron-forge/maker-deb',
            config: { name: 'agenstra' },
          },
        ]
      : []),
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
