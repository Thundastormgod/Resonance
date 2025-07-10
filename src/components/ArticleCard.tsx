
import { Clock, User, Video, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

interface ArticleCardProps {
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image?: string;
  hasVideo?: boolean;
  hasPhotos?: boolean;
  isLead?: boolean;
  columnSpan?: 'single' | 'double' | 'triple';
}

const ArticleCard = ({ 
  title, 
  excerpt, 
  author, 
  date, 
  category, 
  image, 
  hasVideo, 
  hasPhotos, 
  isLead = false,
  columnSpan = 'single'
}: ArticleCardProps) => {
  const getColumnClass = () => {
    switch (columnSpan) {
      case 'double': return 'md:col-span-2';
      case 'triple': return 'md:col-span-3';
      default: return 'md:col-span-1';
    }
  };

  return (
    <motion.article 
      className={`border-b border-ink-300 pb-6 mb-6 ${getColumnClass()}`}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {/* Category kicker */}
      <motion.div 
        className="mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <span className="inline-block bg-ink-800 text-newsprint-50 px-2 py-1 text-xs font-sans uppercase tracking-wide">
          {category}
        </span>
        <div className="flex items-center gap-2 mt-1">
          {hasVideo && (
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <Video size={14} className="text-red-700" />
            </motion.div>
          )}
          {hasPhotos && (
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <Camera size={14} className="text-blue-700" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Image */}
      {image && (
        <motion.div 
          className="mb-4 overflow-hidden"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <img 
            src={image} 
            alt={title}
            className="w-full h-48 md:h-56 object-cover filter sepia-[0.2] contrast-110 brightness-95"
          />
        </motion.div>
      )}

      {/* Headline */}
      <motion.h2 
        className={`font-serif font-bold text-ink-900 mb-3 leading-tight ink-bleed ${
          isLead ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'
        }`}
        whileHover={{ color: '#5d5d5d' }}
        transition={{ duration: 0.2 }}
      >
        <motion.a 
          href="#" 
          className="hover:text-ink-600 transition-colors"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          {title}
        </motion.a>
      </motion.h2>

      {/* Standfirst/Excerpt */}
      <motion.p 
        className={`text-ink-700 mb-4 leading-relaxed ${
          isLead ? 'text-lg font-medium' : 'text-base'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {excerpt}
      </motion.p>

      {/* Byline */}
      <motion.div 
        className="flex items-center gap-4 text-sm text-ink-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center gap-1">
          <User size={14} />
          <span className="font-serif">By {author}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span className="font-serif">{date}</span>
        </div>
      </motion.div>

      {/* Read more link */}
      <motion.div 
        className="mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.a 
          href="#" 
          className="text-ink-900 font-serif font-medium hover:underline inline-flex items-center gap-2"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          Continue Reading 
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            →
          </motion.span>
        </motion.a>
      </motion.div>
    </motion.article>
  );
};

export default ArticleCard;
