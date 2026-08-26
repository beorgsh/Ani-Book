import React from "react";

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className = "w-4 h-4" }: VerifiedBadgeProps) {
  return (
    <svg 
      className={`shrink-0 ${className}`} 
      viewBox="0 0 24 24" 
      aria-label="Verified Studio" 
      title="Verified Studio"
    >
      <path 
        fill="#1877F2" 
        d="M22.5 12.5c0-1.58-.8-2.97-2-3.77.44-1.61.1-3.39-1.02-4.51-1.12-1.12-2.9-1.46-4.51-1.02C14.17 2 12.78 1.2 11.2 1.2c-1.58 0-2.97.8-3.77 2-1.61-.44-3.39-.1-4.51 1.02-1.12 1.12-1.46 2.9-1.02 4.51C1 9.53.2 10.92.2 12.5c0 1.58.8 2.97 2 3.77-.44 1.61-.1 3.39 1.02 4.51 1.12 1.12 2.9 1.46 4.51 1.02 1.2 1.2 2.59 2 4.17 2 1.58 0 2.97-.8 3.77-2 1.61.44 3.39.1 4.51-1.02 1.12-1.12 1.46-2.9 1.02-4.51 1.2-1.2 2-2.59 2-4.17z" 
      />
      <path 
        fill="#FFFFFF" 
        d="M10.2 16.2l-3.7-3.7 1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4z" 
      />
    </svg>
  );
}

export default VerifiedBadge;
