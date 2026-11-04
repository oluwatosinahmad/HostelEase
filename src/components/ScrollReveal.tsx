import React from 'react';
import { useScrollReveal, UseScrollRevealOptions } from '../hooks/useScrollReveal';

export type ScrollRevealAnimation = 
  | 'fade-up' 
  | 'fade-in' 
  | 'fade-down' 
  | 'scale-up' 
  | 'slide-left' 
  | 'slide-right';

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Animation transition type. Default: 'fade-up' */
  animation?: ScrollRevealAnimation;
  /** Index for sequential staggered reveal within a grid/list. Default: 0 */
  staggerIndex?: number;
  /** Fixed base delay in milliseconds before reveal. Default: 0 */
  baseDelayMs?: number;
  /** Milliseconds delay step multiplied by staggerIndex. Default: 80 */
  staggerIntervalMs?: number;
  /** Transition duration in milliseconds. Default: 500 */
  durationMs?: number;
  /** Optional IntersectionObserver custom options */
  options?: UseScrollRevealOptions;
  /** Custom element tag to render as. Default: 'div' */
  as?: React.ElementType;
}

/**
 * Premium ScrollReveal component.
 * Smoothly reveals content when scrolled into the viewport with subtle fade,
 * gentle rise, and sequential staggering. Respects prefers-reduced-motion.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  animation = 'fade-up',
  staggerIndex = 0,
  baseDelayMs = 0,
  staggerIntervalMs = 80,
  durationMs = 500,
  options,
  as: Component = 'div',
  className = '',
  style = {},
  ...rest
}) => {
  const calculatedDelay = Math.min(600, baseDelayMs + Math.max(0, staggerIndex) * staggerIntervalMs);
  
  const { ref, isVisible } = useScrollReveal<any>({
    ...options,
    delayMs: calculatedDelay,
  });

  // Calculate transform for hidden state
  let hiddenTransform = 'translate3d(0, 20px, 0)';
  if (animation === 'fade-in') {
    hiddenTransform = 'none';
  } else if (animation === 'fade-down') {
    hiddenTransform = 'translate3d(0, -20px, 0)';
  } else if (animation === 'scale-up') {
    hiddenTransform = 'scale3d(0.96, 0.96, 1) translate3d(0, 10px, 0)';
  } else if (animation === 'slide-left') {
    hiddenTransform = 'translate3d(24px, 0, 0)';
  } else if (animation === 'slide-right') {
    hiddenTransform = 'translate3d(-24px, 0, 0)';
  }

  const revealStyle: React.CSSProperties = {
    ...style,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translate3d(0, 0, 0) scale3d(1, 1, 1)' : hiddenTransform,
    transitionProperty: 'opacity, transform',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <Component
      ref={ref}
      className={`scroll-reveal-container ${isVisible ? 'is-revealed' : 'is-hidden'} ${className}`}
      style={revealStyle}
      {...rest}
    >
      {children}
    </Component>
  );
};
