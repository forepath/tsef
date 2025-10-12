import {
  formatFiles,
  generateFiles,
  OverwriteStrategy,
  Tree,
  updateJson,
} from '@nx/devkit';
import { applicationGenerator as generatorFn } from '@nx/node';
import * as path from 'path';
import { McpGeneratorSchema } from './schema';

export async function mcpGenerator(tree: Tree, options: McpGeneratorSchema) {
  const appRoot = `apps/mcp-${options.name}`;

  await generatorFn(tree, {
    name: `mcp-${options.name}`,
    directory: appRoot,
    tags: 'type:app,scope:backend',
    skipPackageJson: true,
  });

  updateJson(tree, '.eslintrc.json', (json) => {
    const depConstraints =
      json.overrides[1].rules['@nx/enforce-module-boundaries'][1]
        .depConstraints || [];
    const scopeTag = `scope:backend`;

    if (
      !depConstraints.some((constraint) => constraint.sourceTag === scopeTag)
    ) {
      depConstraints.push({
        sourceTag: scopeTag,
        onlyDependOnLibsWithTags: [scopeTag, 'scope:shared'],
      });
    }

    json.overrides[1].rules['@nx/enforce-module-boundaries'][1].depConstraints =
      depConstraints;

    return json;
  });

  generateFiles(tree, path.join(__dirname, 'files'), appRoot, options, {
    overwriteStrategy: OverwriteStrategy.Overwrite,
  });

  const projectJsonPath = `${appRoot}/project.json`;

  updateJson(tree, projectJsonPath, (projectJson) => {
    if (projectJson.targets) {
      projectJson.targets.debug = {
        executor: 'nx:run-commands',
        options: {
          command: `npx @modelcontextprotocol/inspector node ./dist/apps/mcp-${options.name}/main.js`,
        },
        dependsOn: [{ target: 'build' }],
      };
    }

    return projectJson;
  });

  if (options.protected) {
    // TODO: Bootstrap authentication
  }

  await formatFiles(tree);
}

export default mcpGenerator;
