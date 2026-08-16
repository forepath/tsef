import { buildScopedSearchBody, clampSearchPagination, sanitizeSearchQuery } from './opensearch-query.util';

describe('opensearch-query.util', () => {
  it('sanitizeSearchQuery_EscapesReservedOperators', () => {
    expect(sanitizeSearchQuery('foo:bar +baz')).toContain('\\:');
    expect(sanitizeSearchQuery('foo:bar +baz')).toContain('\\+');
  });

  it('clampSearchPagination_BoundsSizeAndFrom', () => {
    expect(clampSearchPagination(1000, -5)).toEqual({ size: 100, from: 0 });
    expect(clampSearchPagination(10, 20)).toEqual({ size: 10, from: 20 });
  });

  it('buildScopedSearchBody_InjectsMandatoryFilters', () => {
    const body = buildScopedSearchBody({
      query: 'acme',
      fields: ['name', 'email'],
      filters: { tenantId: 't1', userId: 'u1' },
      from: 0,
      size: 10,
    });

    expect(body).toMatchObject({
      from: 0,
      size: 10,
      query: {
        bool: {
          filter: [{ term: { tenantId: 't1' } }, { term: { userId: 'u1' } }],
        },
      },
    });
  });
});
