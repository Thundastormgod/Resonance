import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Splash screen duration: 2.5 seconds
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            transition={{ duration: 1 }}
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.03) 2px,
                rgba(255, 255, 255, 0.03) 4px
              )`
            }}
          />

          {/* Logo container with multiple animations */}
          <div className="relative">
            {/* Outer glow effect */}
            <motion.div
              className="absolute inset-0 blur-3xl opacity-30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 1],
                opacity: [0, 0.4, 0.3]
              }}
              transition={{ 
                duration: 2,
                times: [0, 0.6, 1],
                ease: 'easeOut'
              }}
            >
              <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
            </motion.div>

            {/* Logo with scale and rotation animation */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ 
                scale: [0, 1.1, 1],
                rotate: [-180, 10, 0],
                opacity: [0, 1, 1]
              }}
              transition={{ 
                duration: 1.2,
                times: [0, 0.7, 1],
                ease: [0.34, 1.56, 0.64, 1] // Bouncy easing
              }}
            >
              <motion.img
                src="/resonance-logo.svg"
                alt="Resonance"
                className="w-32 h-32 md:w-40 md:h-40"
                animate={{ 
                  filter: [
                    'brightness(1) drop-shadow(0 0 0px rgba(59, 130, 246, 0))',
                    'brightness(1.2) drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))',
                    'brightness(1) drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))'
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut'
                }}
              />
            </motion.div>

            {/* Orbiting particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: [
                    0,
                    Math.cos((i / 6) * Math.PI * 2) * 80,
                    Math.cos((i / 6) * Math.PI * 2) * 80,
                    0
                  ],
                  y: [
                    0,
                    Math.sin((i / 6) * Math.PI * 2) * 80,
                    Math.sin((i / 6) * Math.PI * 2) * 80,
                    0
                  ],
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>

          {/* App name with typewriter effect */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <motion.span
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
                className="inline-block"
              >
                THE RESONANCE
              </motion.span>
            </motion.h1>

            {/* Tagline with fade and slide */}
            <motion.div
              className="relative overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              <motion.p 
                className="text-lg md:text-xl text-gray-300 italic font-serif"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  delay: 1.5, 
                  duration: 0.7,
                  ease: [0.33, 1, 0.68, 1]
                }}
              >
                "Where Truth has a Voice"
              </motion.p>
              
              {/* Underline animation */}
              <motion.div
                className="h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent mt-2"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.8, duration: 0.8, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>

          {/* Loading dots animation */}
          <motion.div 
            className="absolute bottom-16 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </motion.div>

          {/* Shimmer effect overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 1.5,
              delay: 0.5,
              ease: 'easeInOut'
            }}
            style={{
              transform: 'skewX(-20deg)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
