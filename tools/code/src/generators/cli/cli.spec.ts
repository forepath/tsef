import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import cliGenerator from './cli';

describe('cliGenerator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('scaffolds a CLI app under the selected domain', async () => {
    await cliGenerator(tree, {
      name: 'loadweaver',
      domain: 'loadweaver',
    });

    expect(tree.exists('apps/loadweaver/cli-loadweaver/project.json')).toBe(true);
    expect(tree.exists('apps/loadweaver/cli-loadweaver/src/main.ts')).toBe(true);

    const projectJson = JSON.parse(tree.read('apps/loadweaver/cli-loadweaver/project.json', 'utf-8')!);

    expect(projectJson.name).toBe('loadweaver-cli-loadweaver');
    expect(projectJson.tags).toEqual(['type:app', 'scope:shared', 'domain:loadweaver']);
    expect(projectJson.targets.build.options.bundle).toBe(true);
    expect(projectJson.targets.binary).toBeDefined();
    expect(projectJson.targets.run).toBeDefined();
  });
});
