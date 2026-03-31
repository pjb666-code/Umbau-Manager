import { useEffect, useRef } from "react";

/**
 * Centralized Focus Manager for Modal Dialogs
 *
 * This utility provides consistent focus management across all modal dialogs.
 * It ensures that when a dialog opens, focus is automatically set to the specified
 * input element, preventing focus loss during typing.
 *
 * Usage:
 * ```tsx
 * const inputRef = useFocusOnMount(isDialogOpen);
 * return <Input ref={inputRef} ... />
 * ```
 */

/**
 * Hook that returns a ref and automatically focuses the element when the dialog opens.
 * @param isOpen - Whether the dialog is currently open
 * @param delay - Optional delay in ms before focusing (default: 100ms to allow dialog animation)
 * @returns A ref to attach to the input element that should receive focus
 */
export function useFocusOnMount<T extends HTMLElement = HTMLInputElement>(
  isOpen: boolean,
  delay = 100,
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (isOpen && elementRef.current) {
      const timeoutId = setTimeout(() => {
        elementRef.current?.focus();
      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, delay]);

  return elementRef;
}

/**
 * Hook that focuses an element when a dialog opens and restores focus when it closes.
 * @param isOpen - Whether the dialog is currently open
 * @param delay - Optional delay in ms before focusing (default: 100ms)
 * @returns A ref to attach to the input element that should receive focus
 */
export function useFocusWithRestore<T extends HTMLElement = HTMLInputElement>(
  isOpen: boolean,
  delay = 100,
) {
  const elementRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the target element after a delay
      const timeoutId = setTimeout(() => {
        elementRef.current?.focus();
      }, delay);

      return () => clearTimeout(timeoutId);
    }
    if (previousActiveElement.current) {
      // Restore focus when dialog closes
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen, delay]);

  return elementRef;
}
