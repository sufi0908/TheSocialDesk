/**
 * Classnames merger helper
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
