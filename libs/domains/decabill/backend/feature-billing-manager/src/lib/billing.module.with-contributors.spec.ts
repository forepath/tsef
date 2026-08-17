import { Module } from '@nestjs/common';

import { CONTAINER_MANAGER_NEST_REGISTRATION } from './contributors/container-manager/container-manager.contributor.module';
import { ContainerManagerContributorModule } from './contributors/container-manager/container-manager.contributor.module';
import { resolveContributorNestImports } from './utils/contributor-nest-registration';

@Module({})
class ExtraContributorNestModule {}

describe('resolveContributorNestImports', () => {
  it('includes the first-party Container Manager module', () => {
    const modules = resolveContributorNestImports([]);

    expect(modules).toContain(ContainerManagerContributorModule);
    expect(modules).toContain(CONTAINER_MANAGER_NEST_REGISTRATION.nestModule);
  });

  it('includes extra contributor nest modules', () => {
    const extra = {
      source: 'addon' as const,
      sourceKey: 'acme-ops',
      nestModule: ExtraContributorNestModule,
    };
    const modules = resolveContributorNestImports([extra]);

    expect(modules).toContain(ExtraContributorNestModule);
    expect(modules).toContain(ContainerManagerContributorModule);
  });

  it('rejects a duplicate Container Manager nestModule from extras', () => {
    expect(() =>
      resolveContributorNestImports([
        {
          source: 'addon',
          sourceKey: 'container-manager',
          nestModule: ExtraContributorNestModule,
        },
      ]),
    ).toThrow('Duplicate contributor nestModule registration');
  });
});
