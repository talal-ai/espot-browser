# Adaptive Aurora Style Guide

This guide documents the design tokens, utilities, and usage patterns implemented across the application.

## Design Tokens

Tokens are implemented via CSS variables and Tailwind utilities in `src/index.css`.

- Radius: `--radius: 20px` applied globally across components.
- Ambient Surface: `.ambient-surface` provides soft ambient lighting via subtle gradient overlays.
- Ambient Glow: `.ambient-glow` adds focused border glow on hover/focus using GPU-accelerated transforms.
- Glass Overlay: `.glass-overlay` enables backdrop blur for modal overlays with accessibility-aware motion reduction.

### Color, Typography, Spacing, Elevation, Motion

Refer to Tailwind config and utility classes. Motion follows micro-interaction principles with eased transitions and respects `prefers-reduced-motion`.

## Usage Examples

```
<Card className="ambient-glow">
  <CardHeader>
    <CardTitle>Example</CardTitle>
  </CardHeader>
</Card>
```

```
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent className="backdrop-blur-2xl">...</DialogContent>
</Dialog>
```

## Accessibility

- Motion reduced under `prefers-reduced-motion`.
- All interactive elements include ARIA labels.
- Keyboard navigation supported via Radix UI primitives.

## Governance

Changes to tokens/utilities should be reviewed for performance and accessibility. Ensure no hard-coded values; use configuration and API responses.