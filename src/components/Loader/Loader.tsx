// Loader.tsx
import React from 'react';
import './Loader.css';

interface LoaderProps {
  size?: number;
  color?: string;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 40, 
  color = 'orange',
  className = '' 
}) => {
  return (
    <div 
      className={`loader ${className}`}
      style={{
        width: size,
        height: size,
        ['--loader-color' as any]: color
      }}
    />
  );
};

export default Loader;