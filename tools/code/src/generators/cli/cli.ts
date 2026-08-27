import * as path from 'path';

import { formatFiles, generateFiles, OverwriteStrategy, Tree, updateJson } from '@nx/devkit';
import { applicationGenerator as generatorFn } from '@nx/node';

import { CliGeneratorSchema } from './schema';
import { resolveDomainAppPaths } from '../utils/domain-app-paths';

export async function cliGenerator(tree: Tree, options: CliGeneratorSchema) {
  const domain = options.domain?.trim() || 'loadweaver';
  const { projectName, appRoot } = resolveDomainAppPaths(options.name, 'cli', { domain }, domain);
  const featureLibImport = options.featureLibImport?.trim() || `@forepath/${domain}/shared/feature-cli/program`;

  await generatorFn(tree, {
    name: projectName,
    directory: appRoot,
    tags: `type:app,scope:shared,domain:${domain}`,
    skipPackageJson: true,
    unitTestRunner: 'jest',
    e2eTestRunner: 'jest',
  });

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    appRoot,
    { ...options, domain, featureLibImport, projectName, appRoot },
    {
      overwriteStrategy: OverwriteStrategy.Overwrite,
    },
  );

  const projectJsonPath = `${appRoot}/project.json`;

  updateJson(tree, projectJsonPath, (projectJson) => {
    projectJson.tags = [`type:app`, `scope:shared`, `domain:${domain}`];
    projectJson.implicitDependencies = projectJson.implicitDependencies ?? [];
    const featureDep = `${domain}-shared-feature-cli`;

    if (!projectJson.implicitDependencies.includes(featureDep)) {
      projectJson.implicitDependencies.push(featureDep);
    }

    projectJson.targets = {
      ...projectJson.targets,
      build: {
        executor: '@nx/esbuild:esbuild',
        outputs: ['{options.outputPath}'],
        defaultConfiguration: 'production',
        options: {
          platform: 'node',
          outputPath: `dist/${appRoot}`,
          format: ['cjs'],
          bundle: true,
          main: `${appRoot}/src/main.ts`,
          tsConfig: `${appRoot}/tsconfig.app.json`,
          assets: [],
          generatePackageJson: true,
          thirdParty: true,
          esbuildOptions: {
            sourcemap: true,
            outExtension: {
              '.js': '.js',
            },
          },
        },
        configurations: {
          development: {},
          production: {
            esbuildOptions: {
              sourcemap: false,
              outExtension: {
                '.js': '.js',
              },
            },
          },
        },
      },
      run: {
        executor: 'nx:run-commands',
        options: {
          command: `node dist/${appRoot}/main.js`,
        },
        dependsOn: [{ target: 'build' }],
      },
      binary: {
        executor: 'nx:run-commands',
        dependsOn: ['build'],
        outputs: [`{workspaceRoot}/dist/${appRoot}/bin/${options.name}`],
        options: {
          commands: [
            `npx esbuild ${appRoot}/src/main.ts --bundle --platform=node --format=cjs --outfile=dist/${appRoot}/bin/${options.name}.mjs --banner:js='#!/usr/bin/env node' --tsconfig=${appRoot}/tsconfig.app.json`,
            `mv dist/${appRoot}/bin/${options.name}.mjs dist/${appRoot}/bin/${options.name}`,
            `chmod +x dist/${appRoot}/bin/${options.name}`,
          ],
          parallel: false,
        },
      },
      test: projectJson.targets?.test ?? {
        executor: '@nx/jest:jest',
        outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
        options: {
          jestConfig: `${appRoot}/jest.config.ts`,
          passWithNoTests: true,
        },
      },
    };

    return projectJson;
  });

  await formatFiles(tree);
}

export default cliGenerator;
