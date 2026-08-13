import type { ServiceDetailTabDto } from '@forepath/decabill/frontend/data-access-billing-console';

export const DETAILS_TAB_ID = 'details';

export function isDetailsTab(tabId: string | null | undefined): boolean {
  return !tabId || tabId === DETAILS_TAB_ID;
}

export function parseServiceDetailTabId(
  rawTab: string | null | undefined,
  tabs: ServiceDetailTabDto[] | null | undefined,
): string {
  const fallback = DETAILS_TAB_ID;
  const trimmed = rawTab?.trim() ?? '';

  if (!trimmed) {
    return fallback;
  }

  if (!tabs?.length) {
    return trimmed === DETAILS_TAB_ID ? DETAILS_TAB_ID : fallback;
  }

  if (tabs.some((tab) => tab.id === trimmed)) {
    return trimmed;
  }

  return fallback;
}

export function sortServiceDetailTabs(tabs: ServiceDetailTabDto[] | null | undefined): ServiceDetailTabDto[] {
  if (!tabs?.length) {
    return [{ id: DETAILS_TAB_ID, label: 'Details', order: 0, moduleKey: null }];
  }

  return [...tabs].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
