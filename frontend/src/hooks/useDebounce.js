import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce fast-changing state values (e.g. search input fields)
 * @param {any} value - The input state value to debounce
 * @param {number} delay - Debounce delay in milliseconds (default 300ms)
 * @returns {any} debouncedValue
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
