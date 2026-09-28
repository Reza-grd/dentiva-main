import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -15 },
};

const reducedPageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.3,
};

const PageTransition = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={shouldReduceMotion ? reducedPageVariants : pageVariants}
      transition={shouldReduceMotion ? { duration: 0.1 } : pageTransition}
      className={`min-h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
