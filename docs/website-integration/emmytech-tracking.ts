export type EmmyTechWebsiteEventType =
  | 'website_visited'
  | 'page_viewed'
  | 'product_searched'
  | 'product_viewed'
  | 'product_quick_viewed'
  | 'product_shared'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'whatsapp_purchase_clicked'
  | 'spin_opened_from_product'
  | 'reward_viewed'
  | 'reward_applied'
  | 'cash_off_product_selected'
  | 'cash_off_product_changed'
  | 'cash_off_product_removed'
  | 'full_wheel_opened_from_overlay'
  | 'full_wheel_opened_from_cart'
  | 'returned_from_full_wheel';

export interface EmmyTechTrackingOptions {
  endpoint: string;
  referralCode?: string | null;
  visitorStorageKey?: string;
}

export interface EmmyTechTrackingEvent {
  eventType: EmmyTechWebsiteEventType;
  pageUrl?: string | null;
  searchQuery?: string | null;
  resultsCount?: number | null;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}

const DEFAULT_VISITOR_KEY = 'emmytech_visitor_id';

function createVisitorId() {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `web:${randomId}`.toLowerCase();
}

export function getEmmyTechVisitorId(storageKey = DEFAULT_VISITOR_KEY) {
  if (typeof window === 'undefined') return null;

  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const visitorId = createVisitorId();
  window.localStorage.setItem(storageKey, visitorId);
  return visitorId;
}


export function buildAmbassadorWhatsAppUrl(
  baseReferralUrl: string,
  context: {
    sourcePage?: string | null;
    productId?: string | null;
    searchQuery?: string | null;
  } = {}
) {
  if (typeof window === 'undefined') return baseReferralUrl;

  const url = new URL(baseReferralUrl, window.location.origin);
  const visitorId = getEmmyTechVisitorId();
  if (visitorId) url.searchParams.set('visitor_id', visitorId);
  if (context.sourcePage) url.searchParams.set('source_page', context.sourcePage);
  if (context.productId) url.searchParams.set('product_id', context.productId);
  if (context.searchQuery) url.searchParams.set('search_query', context.searchQuery);
  return url.toString();
}


export function buildAmbassadorSpinUrl(baseSpinUrl: string) {
  if (typeof window === 'undefined') return baseSpinUrl;

  const url = new URL(baseSpinUrl, window.location.origin);
  const visitorId = getEmmyTechVisitorId();
  if (visitorId) url.searchParams.set('visitor_id', visitorId);
  return url.toString();
}

export function createEmmyTechTracker(options: EmmyTechTrackingOptions) {
  const storageKey = options.visitorStorageKey || DEFAULT_VISITOR_KEY;

  async function track(event: EmmyTechTrackingEvent) {
    if (typeof window === 'undefined') return null;

    const visitorId = getEmmyTechVisitorId(storageKey);
    if (!visitorId) return null;

    const payload = {
      visitorId,
      eventType: event.eventType,
      pageUrl: event.pageUrl || window.location.href,
      searchQuery: event.searchQuery || null,
      resultsCount:
        typeof event.resultsCount === 'number' ? event.resultsCount : null,
      productId: event.productId || null,
      referralCode: options.referralCode || null,
      metadata: event.metadata || {},
    };

    try {
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'omit',
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      // Tracking must never block the shopping experience.
      return null;
    }
  }

  function recordInitialVisit() {
    const sessionKey = `${storageKey}:visited`;
    const alreadyRecorded = window.sessionStorage.getItem(sessionKey);

    if (!alreadyRecorded) {
      window.sessionStorage.setItem(sessionKey, '1');
      void track({ eventType: 'website_visited' });
    }

    void track({ eventType: 'page_viewed' });
  }

  return {
    track,
    recordInitialVisit,
    trackSearch(searchQuery: string, resultsCount: number) {
      return track({
        eventType: 'product_searched',
        searchQuery,
        resultsCount,
      });
    },
    trackProductView(productId: string, metadata: Record<string, unknown> = {}) {
      return track({
        eventType: 'product_viewed',
        productId,
        metadata,
      });
    },
    trackAddToCart(productId: string, metadata: Record<string, unknown> = {}) {
      return track({
        eventType: 'add_to_cart',
        productId,
        metadata,
      });
    },
    trackWhatsAppClick(productId?: string | null, metadata: Record<string, unknown> = {}) {
      return track({
        eventType: 'whatsapp_purchase_clicked',
        productId: productId || null,
        metadata,
      });
    },
  };
}
