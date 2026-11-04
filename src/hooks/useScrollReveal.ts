import { useEffect, useRef, useState } from 'react';

export interface UseScrollRevealOptions {
  /** IntersectionObserver threshold (0 to 1). Default: 0.12 */
  threshold?: number;
  /** IntersectionObserver rootMargin string. Default: '0px 0px -40px 0px' */
  rootMargin?: string;
  /** Milliseconds delay before triggering transition after entering viewport. Default: 0 */
  delayMs?: number;
  /** Trigger only once when first entering viewport and disconnect observer. Default: true */
  once?: boolean;
}

/**
 * Lightweight, high-performance IntersectionObserver hook for scroll-triggered reveal animations.
 * Automatically respects `prefers-reduced-motion` and disconnects after reveal to avoid repeated replaying.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -40px 0px',
    delayMs = 0,
    once = true,
  } = options;

  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Accessibility: Respect user's motion preferences
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    // Fallback if IntersectionObserver is not available in legacy environment
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          if (delayMs > 0) {
            timer = setTimeout(() => {
              setIsVisible(true);
            }, delayMs);
          } else {
            setIsVisible(true);
          }

          if (once) {
            observer.unobserve(element);
            observer.disconnect();
          }
        } else if (!once) {
          if (timer) clearTimeout(timer);
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [threshold, rootMargin, delayMs, once]);

  return { ref, isVisible };
}
