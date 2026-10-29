import React from 'react';

/**
 * Reusable Badge component for categories, availability, and safety indicators.
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon: Icon,
}) {
  const variantStyles = {
    available: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md tracking-wide ${variantStyles[variant] || variantStyles.neutral} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
