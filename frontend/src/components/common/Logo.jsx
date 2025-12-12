import React from 'react';

// Logo component centralizes logo usage across the app to keep it consistent.
// It loads from the public folder so Vite serves it at runtime.
// Prefer SVG for crisp scaling; fallback to PNG if needed.
export function Logo({ size = 40, className = '', alt = 'ESPOT Browser' }) {
  // Use SVG where possible; ensure asset exists in /public
  const svgSrc = '/icon0.svg';
  const pngSrc = '/icon1.png';

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Try SVG first; fallback PNG via <img> onError */}
      <img
        src={svgSrc}
        alt={alt}
        width={size}
        height={size}
        className="select-none"
        onError={(e) => {
          // Fallback to PNG if SVG fails
          e.currentTarget.src = pngSrc;
        }}
      />
    </div>
  );
}

export default Logo;