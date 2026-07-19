import React from 'react';
import { CIET_LOGO_URL } from '../pages/constants';

interface LogoHeaderProps {
  alt?: string;
  className?: string;
  imageStyle?: React.CSSProperties;
}

export default function LogoHeader({ alt = "CIET Logo", className = "", imageStyle }: LogoHeaderProps) {
  const handleClick = () => {
    // Navigate to dashboard home or refresh current page which forces re-evaluation of user session
    window.location.href = '/';
  };

  return (
    <div className={`ciet-logo-header-wrap ${className}`} onClick={handleClick}>
      <img
        src={CIET_LOGO_URL}
        alt={alt}
        className="ciet-nav-logo-img"
        style={imageStyle}
        onError={(e) => {
          // fallback to text badge if logo doesn't load
          (e.target as HTMLImageElement).style.display = 'none';
          const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
          if (next) next.style.display = 'flex';
        }}
      />
      <div className="ciet-brand-badge-fallback" style={{ display: 'none' }}>CIET</div>
    </div>
  );
}
