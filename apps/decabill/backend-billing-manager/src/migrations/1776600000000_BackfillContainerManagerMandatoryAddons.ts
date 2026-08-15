import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures Container Manager catalog addon exists per tenant and marks it
 * allowed+mandatory on plans that already use integrated Docker stacks.
 */
export class BackfillContainerManagerMandatoryAddons1776600000000 implements MigrationInterface {
  name = 'BackfillContainerManagerMandatoryAddons1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "billing_addons" (
        "id",
        "tenant_id",
        "key",
        "name",
        "description",
        "implementation_type",
        "module_key",
        "config_schema",
        "compatible_providers",
        "base_price",
        "price_interval_type",
        "price_interval_value",
        "is_active"
      )
      SELECT
        uuid_generate_v4(),
        tenants."tenant_id",
        'container-manager',
        'Container Manager',
        'Docker host insights: containers, resource usage, and overlay networking on the service.',
        'module',
        'container-manager',
        '{}'::jsonb,
        '[]'::jsonb,
        0,
        'month',
        1,
        true
      FROM (
        SELECT DISTINCT "tenant_id" FROM "billing_service_plans"
        UNION
        SELECT DISTINCT "tenant_id" FROM "billing_addons"
      ) AS tenants("tenant_id")
      WHERE NOT EXISTS (
        SELECT 1
        FROM "billing_addons" existing
        WHERE existing."tenant_id" = tenants."tenant_id"
          AND existing."key" = 'container-manager'
      )
    `);

    await queryRunner.query(`
      UPDATE "billing_service_plans" AS plan
      SET "provider_config_defaults" = jsonb_set(
        jsonb_set(
          COALESCE(plan."provider_config_defaults", '{}'::jsonb),
          '{allowedAddonIds}',
          COALESCE(
            (
              SELECT to_jsonb(
                ARRAY(
                  SELECT DISTINCT elem
                  FROM jsonb_array_elements_text(
                    COALESCE(plan."provider_config_defaults"->'allowedAddonIds', '[]'::jsonb) || to_jsonb(ARRAY[addon.id::text])
                  ) AS elem
                )
              )
            ),
            to_jsonb(ARRAY[addon.id::text])
          ),
          true
        ),
        '{mandatoryAddonIds}',
        COALESCE(
          (
            SELECT to_jsonb(
              ARRAY(
                SELECT DISTINCT elem
                FROM jsonb_array_elements_text(
                  COALESCE(plan."provider_config_defaults"->'mandatoryAddonIds', '[]'::jsonb) || to_jsonb(ARRAY[addon.id::text])
                ) AS elem
              )
            )
          ),
          to_jsonb(ARRAY[addon.id::text])
        ),
        true
      )
      FROM "billing_addons" AS addon
      WHERE addon."tenant_id" = plan."tenant_id"
        AND addon."key" = 'container-manager'
        AND plan."service_type_id" IS NOT NULL
        AND (
          COALESCE(plan."provider_config_defaults"->'provisioningOptions', '[]'::jsonb) @> '[{"type":"integrated"}]'::jsonb
          OR COALESCE(plan."provider_config_defaults"->>'service', '') IN (
            'agenstra-controller',
            'agenstra-manager',
            'decabill-billing',
            'controller',
            'manager'
          )
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "billing_service_plans" AS plan
      SET "provider_config_defaults" = (
        SELECT jsonb_strip_nulls(
          jsonb_set(
            jsonb_set(
              COALESCE(plan."provider_config_defaults", '{}'::jsonb),
              '{allowedAddonIds}',
              COALESCE(
                (
                  SELECT to_jsonb(array_agg(elem))
                  FROM jsonb_array_elements_text(COALESCE(plan."provider_config_defaults"->'allowedAddonIds', '[]'::jsonb)) AS elem
                  WHERE elem <> addon.id::text
                ),
                '[]'::jsonb
              ),
              true
            ),
            '{mandatoryAddonIds}',
            COALESCE(
              (
                SELECT to_jsonb(array_agg(elem))
                FROM jsonb_array_elements_text(COALESCE(plan."provider_config_defaults"->'mandatoryAddonIds', '[]'::jsonb)) AS elem
                WHERE elem <> addon.id::text
              ),
              '[]'::jsonb
            ),
            true
          )
        )
      )
      FROM "billing_addons" AS addon
      WHERE addon."tenant_id" = plan."tenant_id"
        AND addon."key" = 'container-manager'
        AND plan."service_type_id" IS NOT NULL
        AND (
          COALESCE(plan."provider_config_defaults"->'provisioningOptions', '[]'::jsonb) @> '[{"type":"integrated"}]'::jsonb
          OR COALESCE(plan."provider_config_defaults"->>'service', '') IN (
            'agenstra-controller',
            'agenstra-manager',
            'decabill-billing',
            'controller',
            'manager'
          )
        )
    `);
  }
}
