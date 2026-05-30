'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', interactive = false, ...props }) => {
  const baseStyles = "bg-mangi-panel border border-mangi-border rounded-xl backdrop-blur-md overflow-hidden";
  const interactiveStyles = interactive ? "hover:bg-mangi-panel-hover hover:border-mangi-border-active transition-colors duration-300 cursor-pointer" : "";

  return (
    <motion.div 
      className={`${baseStyles} ${interactiveStyles} ${className}`}
      whileHover={interactive ? { y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" } : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};
