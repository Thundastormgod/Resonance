
import { motion } from 'framer-motion';

const Footer = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.footer 
      className="bg-ink-900 text-newsprint-50 mt-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
    >
      <div className="container mx-auto px-4 py-12">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-8"
          variants={containerVariants}
        >
          <motion.div className="md:col-span-2" variants={itemVariants}>
            <motion.h3 
              className="font-serif text-2xl font-bold mb-4 ink-bleed"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              The Resonance
            </motion.h3>
            <p className="text-newsprint-300 font-serif leading-relaxed">
              Where truth has a voice. Dedicated to bringing you the most compelling 
              narratives, insightful analysis, and captivating multimedia content.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h4 className="font-serif text-lg font-semibold mb-4">Sections</h4>
            <ul className="space-y-2">
              {['News', 'Features', 'Video Journal', 'Photo Essays', 'Opinion'].map((item, index) => (
                <motion.li 
                  key={item}
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={`/${item.toLowerCase().replace(' ', '-')}`} 
                    className="text-newsprint-300 hover:text-newsprint-50 transition-colors"
                  >
                    {item}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h4 className="font-serif text-lg font-semibold mb-4">About</h4>
            <ul className="space-y-2">
              {[
                { name: 'About Us', href: '/about' },
                { name: 'Contact', href: '/contact' },
                { name: 'Subscribe', href: '/subscribe' },
                { name: 'Archive', href: '/archive' }
              ].map((item, index) => (
                <motion.li 
                  key={item.name}
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <a 
                    href={item.href} 
                    className="text-newsprint-300 hover:text-newsprint-50 transition-colors"
                  >
                    {item.name}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="border-t border-ink-700 mt-12 pt-8 text-center"
          variants={itemVariants}
        >
          <p className="text-newsprint-400 font-serif">
            © 2025 The Resonance. All rights reserved.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;
