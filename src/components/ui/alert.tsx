import type { MouseEventHandler } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const typeStyles = {
  success: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
};

export default function Alert({
  type = 'info',
  message = 'This is an alert message.',
  className,
  onClick,
}: AlertProps) {
  const reducedMotion = useReducedMotion();
  const content = (
    <>
      <span className="font-bold capitalize">{type}:</span>
      <span>{message}</span>
    </>
  );
  const styles = cn(
    'racction-alert border px-4 py-3 flex gap-x-2 items-start rounded-2xl text-sm',
    `racction-alert--${type}`,
    typeStyles[type],
    className,
  );

  return (
    <motion.div
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
      className={onClick ? undefined : styles}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(styles, 'w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current')}
        >
          {content}
        </button>
      ) : content}
    </motion.div>
  );
}
