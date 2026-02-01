import React from 'react';
// Use public folder asset since src/assets was cleaned up
const brandLogo = '/web-app-manifest-512x512.png';

// Logo component centralizes logo usage across the app to keep it consistent.
// It loads from the shared branded asset pack so production builds always show ESPOT art.
export function Logo({ size = 40, className = '', alt = 'ESPOT Browser' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src={brandLogo}
        alt={alt}
        width={size}
        height={size}
        className="select-none"
        onError={(e) => {
          // Fallback to the shipped SVG in public if the PNG fails to load
          e.currentTarget.src = '/icon0.svg';
        }}
      />
    </div>
  );
}

export default Logo;