# Templates Page Documentation

The Templates page composes dynamic UI templates fetched from the backend using existing components.

## Components Used

- GlassCard: Provides glass blur and ambient visuals for containers.
- StatCard: Displays key statistics about available templates.
- DataTable (lazy-loaded): Shows template catalog with search/sort.
- Dialog: Modal windows for information and template preview.
- Button: Action triggers.

## API Integration

Data is fetched via `apiService.get(API_ENDPOINTS.templates.list)` using the `useApi` hook. No hard-coded content; all labels and metadata originate from API responses when available.

## Accessibility

- ARIA labels on actionable buttons.
- Keyboard navigation supported via Radix Dialog and Button components.

## Usage

Route: `/templates`

```
import Templates from "@/pages/Templates";
// Register in router under a protected route
```

## Performance

- DataTable is lazy-loaded to reduce initial bundle.
- Framer Motion animations are subtle and GPU-accelerated.