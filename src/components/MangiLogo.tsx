'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface MangiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withWordmark?: boolean;
}

export const MangiLogo: React.FC<MangiLogoProps> = ({ className = '', size = 'md', withWordmark = false }) => {
  const sizes = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div 
        whileHover={{ scale: 1.05, rotate: -5 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex items-center justify-center drop-shadow-[0_0_15px_rgba(255,159,28,0.4)] ${sizes[size]}`}
      >
        <img src="/branding/mangi-icon-transparent.png" alt="MANGI Logo" className="w-full h-full object-contain" />
      </motion.div>
      
      {withWordmark && (
        <img 
          src="/branding/mangi-wordmark.png" 
          alt="MANGI" 
          className={`object-contain ${size === 'sm' ? 'h-5' : size === 'md' ? 'h-6' : size === 'lg' ? 'h-8' : 'h-12'}`} 
        />
      )}
    </div>
  );
};
