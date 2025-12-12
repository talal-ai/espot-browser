# Performance Metrics Report (Planned)

This report outlines measurement methodology and target metrics. Run the app in production mode and capture metrics using Lighthouse and browser Performance panel.

## Methodology

- Build production bundle: `npm run build`
- Serve locally and run Lighthouse in Chrome.
- Record Core Web Vitals: LCP, CLS, FID/INP.
- Measure TTI and TBT.

## Targets

- LCP: < 2.5s on modern devices.
- CLS: < 0.1.
- INP: < 200ms.
- Bundle size: keep route-level chunks < 200KB gzipped.

## Optimizations Implemented

- Lazy-loading DataTable component.
- CSS transform-based animations with GPU acceleration.
- Reduced re-renders by memoizing derived stats.
- Avoid hard-coded values; leverage configuration and API data.

## Next Steps

- Introduce route-level code splitting where appropriate.
- Audit image assets and apply responsive images.
- Consider prefetching critical template data.