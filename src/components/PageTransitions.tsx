import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Newspaper Flip Page Transition
 * Creates a 3D flip animation when navigating between articles/pages
 */
export const NewspaperFlipTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={{
          initial: {
            rotateY: -90,
            opacity: 0,
            transformOrigin: 'left center',
            transformPerspective: 1200,
          },
          animate: {
            rotateY: 0,
            opacity: 1,
            transformOrigin: 'left center',
            transformPerspective: 1200,
            transition: {
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for smooth flip
            },
          },
          exit: {
            rotateY: 90,
            opacity: 0,
            transformOrigin: 'right center',
            transformPerspective: 1200,
            transition: {
              duration: 0.5,
              ease: [0.43, 0.13, 0.23, 0.96],
            },
          },
        }}
        style={{
          backfaceVisibility: 'hidden',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Article Card Flip Animation
 * Used for individual article cards in grid/list views
 */
export const ArticleCardFlip: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      whileHover={{
        rotateY: 5,
        scale: 1.02,
        transition: {
          duration: 0.3,
          ease: 'easeOut',
        },
      }}
      style={{
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Page Turn Animation (Alternative to flip)
 * Mimics turning a newspaper page
 */
export const PageTurnTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={{
          initial: {
            clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
            opacity: 0.5,
          },
          animate: {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            opacity: 1,
            transition: {
              duration: 0.7,
              ease: [0.65, 0, 0.35, 1],
            },
          },
          exit: {
            clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
            opacity: 0.5,
            transition: {
              duration: 0.6,
              ease: [0.65, 0, 0.35, 1],
            },
          },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Slide Paper Animation
 * Articles slide in like pulling out a newspaper page
 */
export const SlidePaperTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ x: '100%', opacity: 0 }}
        animate={{ 
          x: 0, 
          opacity: 1,
          transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }
        }}
        exit={{ 
          x: '-100%', 
          opacity: 0,
          transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }
        }}
        style={{
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Fade with Scale (Subtle option)
 * Gentle zoom transition for smooth reading experience
 */
export const FadeScaleTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          transition: {
            duration: 0.4,
            ease: 'easeOut',
          }
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.95,
          transition: {
            duration: 0.3,
            ease: 'easeIn',
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
