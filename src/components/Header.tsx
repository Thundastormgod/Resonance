
import { Calendar, Search, Menu, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });



  const mainNavigation = [
    { name: 'Home', href: '/', featured: true },
    { name: 'UK', href: '/uk' },
    { name: 'World', href: '/world' },
    { name: 'Comment', href: '/comment' },
    { name: 'Life & Style', href: '/life-style' },
    { name: 'Business & Money', href: '/business' },
    { name: 'Sport', href: '/sport' },
    { name: 'Culture', href: '/culture' },
    { name: 'Travel', href: '/travel' }
  ];

  const mediaNavigation = [
    { name: 'Videos', href: '/videos', icon: '📹' },
    { name: 'Podcasts', href: '/podcasts', icon: '🎧' },
    { name: 'Music', href: '/music', icon: '🎵' }
  ];

  const topicsNavigation = [
    'News & Politics',
    'Film & Television', 
    'Sports',
    'Pop Culture',
    'Events'
  ];

  const specialSections = [
    { name: 'Puzzles', href: '/puzzles' },
    { name: 'Magazines', href: '/magazines' },
    { name: 'Trending', href: '/trending' }
  ];

  const menuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <header className="border-b-2 border-ink-800 bg-background newspaper-texture transition-colors duration-300">
      {/* Top utility bar */}
      <motion.div 
        className="border-b border-ink-400 py-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 flex justify-between items-center text-sm">
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-ink-600" />
              <span className="font-serif text-ink-700">{currentDate}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Globe size={14} className="text-ink-500" />
              <span className="text-ink-600">London Edition</span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-ink-600">
              <span>Est. 2024</span>
              <span>•</span>
              <span>Digital Edition</span>
            </div>
            

            
            {/* Search toggle */}
            <motion.button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 rounded-full hover:bg-ink-100 transition-colors"
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search size={16} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            className="border-b border-ink-300 bg-ink-50"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="container mx-auto px-4 py-4">
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Search The Resonance..."
                  className="flex-1 px-4 py-2 border border-ink-300 rounded bg-background text-foreground"
                  autoFocus
                />
                <button className="px-6 py-2 bg-ink-800 text-newsprint-50 rounded hover:bg-ink-700 transition-colors">
                  Search
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main masthead */}
      <motion.div 
        className="py-8 masthead-border"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.h1 
            className="newspaper-headline text-6xl md:text-8xl text-ink-900 mb-3 ink-bleed"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            The Resonance
          </motion.h1>
          <motion.p 
            className="font-serif italic text-lg text-ink-700 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            "Where Truth has a Voice"
          </motion.p>
          <motion.div 
            className="newspaper-kicker text-ink-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Informative • Accurate • Global
          </motion.div>
        </div>
      </motion.div>

      {/* Main navigation */}
      <nav className="bg-deep-navy text-white transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <motion.div 
              className="hidden lg:flex space-x-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {mainNavigation.map((item, index) => (
                <motion.a 
                  key={item.name}
                  href={item.href}
                  className={`hover:text-newsprint-300 transition-colors font-serif relative ${
                    item.featured ? 'font-bold text-newsprint-200' : ''
                  }`}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ transitionDelay: `${0.1 * index}s` }}
                >
                  {item.name}
                  <motion.div
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-newsprint-300"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.a>
              ))}
            </motion.div>
            
            {/* Media & Special sections */}
            <motion.div 
              className="hidden md:flex items-center gap-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {mediaNavigation.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2 hover:text-newsprint-300 transition-colors text-sm"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </motion.a>
              ))}
            </motion.div>
            
            <motion.button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu size={20} />
            </motion.button>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                className="lg:hidden py-6 border-t border-ink-600"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <div className="space-y-6">
                  {/* Main navigation mobile */}
                  <div>
                    <h3 className="newspaper-kicker text-newsprint-400 mb-3">Main Sections</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {mainNavigation.map((item, index) => (
                        <motion.a 
                          key={item.name}
                          href={item.href}
                          className="hover:text-newsprint-300 transition-colors font-serif py-2"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ transitionDelay: `${0.1 * index}s` }}
                          whileHover={{ x: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.name}
                        </motion.a>
                      ))}
                    </div>
                  </div>
                  
                  {/* Topics mobile */}
                  <div>
                    <h3 className="newspaper-kicker text-newsprint-400 mb-3">Topics</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {topicsNavigation.map((topic, index) => (
                        <motion.a 
                          key={topic}
                          href={`/topic/${topic.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                          className="hover:text-newsprint-300 transition-colors font-serif py-1 text-sm"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ transitionDelay: `${0.1 * (index + mainNavigation.length)}s` }}
                          whileHover={{ x: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {topic}
                        </motion.a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Secondary navigation bar */}
      <div className="bg-slate-600 text-white py-2 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="hidden md:flex items-center gap-6">
              <span className="newspaper-kicker text-newsprint-400">Topics:</span>
              {topicsNavigation.slice(0, 3).map((topic, index) => (
                <motion.a
                  key={topic}
                  href={`/topic/${topic.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                  className="hover:text-newsprint-100 transition-colors"
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.2 }}
                >
                  {topic}
                </motion.a>
              ))}
            </div>
            
            <div className="flex items-center gap-4">
              {specialSections.map((section, index) => (
                <motion.a
                  key={section.name}
                  href={section.href}
                  className="hover:text-newsprint-100 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  {section.name}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
