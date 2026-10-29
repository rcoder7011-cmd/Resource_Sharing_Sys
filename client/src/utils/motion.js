import gsap from 'gsap';

/**
 * Check if the user's OS has requested reduced motion
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate an element or list of elements smoothly on entrance
 * @param {HTMLElement|string} target
 * @param {Object} options
 */
export function animateEntrance(target, options = {}) {
  if (prefersReducedMotion() || !target) return;

  const {
    duration = 0.4,
    y = 12,
    delay = 0,
    ease = 'power2.out',
    stagger = 0.05,
    onComplete,
  } = options;

  return gsap.fromTo(
    target,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease,
      stagger,
      clearProps: 'transform',
      onComplete,
    }
  );
}

/**
 * Animate a new chat message bubble entering the feed
 * Restrained duration and motion so it feels snappy and natural
 */
export function animateNewMessage(target) {
  if (prefersReducedMotion() || !target) return;

  return gsap.fromTo(
    target,
    { opacity: 0, y: 8, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.25,
      ease: 'power2.out',
      clearProps: 'transform,scale',
    }
  );
}

/**
 * Animate hover lift for cards or interactive items
 */
export function animateHoverLift(target, isEntering) {
  if (prefersReducedMotion() || !target) return;

  gsap.to(target, {
    y: isEntering ? -3 : 0,
    duration: 0.2,
    ease: 'power2.out',
  });
}

