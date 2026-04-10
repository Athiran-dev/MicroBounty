import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...rest 
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for high-end "magnetic" feel
  const springConfig = { damping: 15, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!btnRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    
    // Calculate cursor position relative to button center
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Attraction force (magnetic strength)
    const strength = 18; 
    x.set((clientX - centerX) / strength);
    y.set((clientY - centerY) / strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...props } = rest as any;
  const baseStyles = 'relative px-6 py-2.5 rounded-full font-display font-semibold transition-shadow duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none overflow-hidden select-none cursor-pointer';
  
  const variants = {
    primary: 'bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)]',
    secondary: 'bg-brand-surface-high text-brand-primary border border-brand-outline-variant hover:bg-brand-surface-container shadow-sm',
    ghost: 'bg-transparent text-brand-primary hover:bg-brand-outline-variant'
  };

  return (
    <motion.button
      ref={btnRef}
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseStyles} ${variants[variant]} ${className} group`}
      {...props}
    >
      <span className="relative z-10 block">
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          children
        )}
      </span>
      
      {/* Light Mode Inner Glow (Billion Dollar Look) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Magnetic Shine Reflection */}
      <motion.div 
        style={{ 
          x: useTransform(xSpring, (v) => v * 1.5), 
          y: useTransform(ySpring, (v) => v * 1.5) 
        }}
        className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-transparent opacity-0 group-hover:opacity-50 blur-xl pointer-events-none" 
      />
    </motion.button>
  );
};
