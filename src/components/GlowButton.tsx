'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { playHover, playClickConfirm } from '@/utils/sound';

interface GlowButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'mango' | 'leaf';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ variant = 'primary', size = 'md', children, className = '', onClick, ...props }, ref) => {
    
    const baseStyles = "relative inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 overflow-hidden outline-none";
    
    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg"
    };

    const variantStyles = {
      primary: "bg-white/10 hover:bg-white/15 text-mangi-text-primary border border-mangi-border hover:border-mangi-orange/50",
      secondary: "bg-transparent hover:bg-white/5 text-mangi-text-secondary border border-transparent hover:border-mangi-border",
      danger: "bg-mangi-danger/20 hover:bg-mangi-danger/30 text-mangi-danger border border-mangi-danger/50",
      mango: "bg-gradient-to-r from-mangi-red to-mangi-orange hover:from-mangi-deep-red hover:to-mangi-red text-white border border-mangi-orange/50 shadow-[0_0_15px_rgba(255,159,28,0.3)] hover:shadow-[0_0_25px_rgba(255,159,28,0.6)]",
      leaf: "bg-mangi-leaf/20 hover:bg-mangi-leaf/30 text-mangi-leaf border border-mangi-leaf/50 shadow-[0_0_15px_rgba(59,170,53,0.2)] hover:shadow-[0_0_20px_rgba(59,170,53,0.4)]"
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      playHover();
      props.onMouseEnter?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playClickConfirm();
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    );
  }
);

GlowButton.displayName = 'GlowButton';
