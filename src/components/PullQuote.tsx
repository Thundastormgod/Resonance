
import { motion } from 'framer-motion';

interface PullQuoteProps {
  quote: string;
  author?: string;
}

const PullQuote = ({ quote, author }: PullQuoteProps) => {
  return (
    <motion.blockquote 
      className="my-8 px-6 py-4 border-l-4 border-ink-700 bg-newsprint-100"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.02, x: 5 }}
    >
      <motion.p 
        className="text-xl md:text-2xl font-serif italic text-ink-800 leading-relaxed ink-bleed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        "{quote}"
      </motion.p>
      {author && (
        <motion.cite 
          className="block mt-3 text-sm font-sans text-ink-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          — {author}
        </motion.cite>
      )}
    </motion.blockquote>
  );
};

export default PullQuote;
