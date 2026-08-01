# EmmyTech website tracking integration

The V3 installer creates the tracking backend in the Spin Wheel project at:

```text
POST /api/tracking/website-event
```

Copy `emmytech-tracking.ts` into the EmmyTech store website project.

## Example

```ts
import {
  buildAmbassadorSpinUrl,
  buildAmbassadorWhatsAppUrl,
  createEmmyTechTracker,
} from '@/lib/emmytech-tracking';

const tracker = createEmmyTechTracker({
  endpoint: 'https://spinwheel.emmytechnology.com/api/tracking/website-event',
  referralCode: currentAmbassadorCode,
});

tracker.recordInitialVisit();

// After a product search
tracker.trackSearch(searchText, filteredProducts.length);

// When a product page is opened
tracker.trackProductView(product.id, { productName: product.name });

// Before opening WhatsApp
tracker.trackWhatsAppClick(product.id, {
  productName: product.name,
  source: 'product-card',
});

const attributedWhatsAppUrl = buildAmbassadorWhatsAppUrl(
  ambassadorReferralUrl,
  {
    sourcePage: window.location.pathname,
    productId: product.id,
    searchQuery: currentSearchText,
  }
);

window.location.href = attributedWhatsAppUrl;

// Before opening the Ambassador Spin Wheel
const attributedSpinUrl = buildAmbassadorSpinUrl(ambassadorSpinUrl);
window.location.href = attributedSpinUrl;
```

For local testing use:

```text
http://127.0.0.1:3000/api/tracking/website-event
```

The store repository is not included in this package, so this module must be copied and called from the actual search, product and WhatsApp button code before the store can emit events.
