module.exports = {
  displayName: 'loadweaver-shared-feature-cli-cluster',
  preset: '../../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    '\\.tpl$': '<rootDir>/../../../../../tools/jest/tpl-loader.cjs',
  },
  moduleFileExtensions: ['ts', 'js', 'html', 'tpl'],
  coverageDirectory:
    '../../../../../coverage/libs/domains/loadweaver/shared/feature-cli-cluster',
};
