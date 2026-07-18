import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export function FormError({ message, id, className }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          id={id ? `${id}-error` : undefined}
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
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
