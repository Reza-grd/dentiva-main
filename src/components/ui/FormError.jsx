import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function FormError({ message, id, className }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          id={id ? `${id}-error` : undefined}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, height: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, height: 'auto' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, height: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
          className={cn("flex items-center gap-1.5 mt-1.5 text-red-500 overflow-hidden", className)}
          role="alert"
        >
          <AlertCircle size={14} className="shrink-0" />
          <p className="text-xs font-medium">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
