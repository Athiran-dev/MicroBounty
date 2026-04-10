import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'base' | 'premium' | 'liquid';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  variant = 'base', 
  className = '', 
  ...props 
}) => {
  const styles = variant === 'premium' ? 'glass-premium' : variant === 'liquid' ? 'glass-liquid' : 'glass';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${styles} rounded-2xl p-6 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
