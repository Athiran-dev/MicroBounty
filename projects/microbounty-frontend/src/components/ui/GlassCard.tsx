import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'base' | 'premium' | 'liquid' | 'card' | 'mirror';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  variant = 'base', 
  className = '', 
  ...props 
}) => {
  const variantStyles = {
    base: 'glass',
    premium: 'glass-premium',
    liquid: 'glass-liquid',
    card: 'glass-card',
    mirror: 'mirror'
  };
  const styles = variantStyles[variant] || 'glass';
  
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
