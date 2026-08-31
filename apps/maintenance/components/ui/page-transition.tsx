'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export function PageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        type: 'spring', 
        stiffness: 260, 
        damping: 20, 
        mass: 0.5 
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
