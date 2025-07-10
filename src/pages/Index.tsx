
import { motion } from 'framer-motion';
import Header from '../components/Header';
import ArticleCard from '../components/ArticleCard';
import Footer from '../components/Footer';
import { Clock, TrendingUp, Globe, Video, Camera } from 'lucide-react';

const Index = () => {
  const leadStory = {
    title: "Global Climate Summit Reaches Historic Agreement",
    excerpt: "World leaders unite in unprecedented commitment to carbon neutrality, marking a turning point in the fight against climate change with binding targets and revolutionary funding mechanisms.",
    author: "Sarah Chen",
    date: "December 15, 2024",
    category: "Breaking News",
    image: "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=800&h=600&fit=crop",
    hasVideo: true,
    isBreaking: true
  };

  const featuredStories = [
    {
      title: "The Digital Renaissance: Technology Reshaping Human Connection",
      excerpt: "In an era where virtual interactions rival physical presence, we explore how technology is redefining 21st-century relationships and social structures.",
      author: "Dr. Marcus Rodriguez",
      date: "December 15, 2024",
      category: "Features",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop",
      hasVideo: true
    },
    {
      title: "Westminster Insider: Behind the Scenes of Political Power",
      excerpt: "Exclusive access to the corridors of power reveals the intricate negotiations shaping Britain's future in an increasingly complex global landscape.",
      author: "James Thompson",
      date: "December 14, 2024",
      category: "UK Politics",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=400&fit=crop"
    },
    {
      title: "Markets in Turmoil: Economic Winds of Change",
      excerpt: "Global markets respond to unprecedented monetary policy shifts as central banks navigate inflation concerns and growth imperatives.",
      author: "Elena Vasquez",
      date: "December 14, 2024",
      category: "Business",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop"
    }
  ];

  const quickNews = [
    { title: "Parliament Debates Emergency Climate Legislation", time: "2 hours ago", category: "UK" },
    { title: "FTSE 100 Reaches Record High Amid Tech Rally", time: "3 hours ago", category: "Business" },
    { title: "Cultural Renaissance: Museums Report Visitor Surge", time: "4 hours ago", category: "Culture" },
    { title: "Sports Update: Premier League Title Race Intensifies", time: "5 hours ago", category: "Sport" },
    { title: "Travel Alert: New International Flight Routes Announced", time: "6 hours ago", category: "Travel" }
  ];

  const trending = [
    { title: "Climate Summit Agreement", reads: "45.2K" },
    { title: "Digital Privacy Laws", reads: "32.1K" },
    { title: "Economic Recovery Plans", reads: "28.7K" },
    { title: "Cultural Heritage Protection", reads: "19.3K" },
    { title: "International Relations", reads: "15.8K" }
  ];

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
    hidden: { y: 30, opacity: 0 },
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
    <div className="min-h-screen newspaper-texture transition-colors duration-300">
      <Header />
      
      <motion.main 
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Breaking News Banner */}
        {leadStory.isBreaking && (
          <motion.div 
            className="mb-6 bg-red-700 dark:bg-red-800 text-white py-2 px-4 rounded"
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <motion.span 
                className="font-bold uppercase tracking-wide text-sm"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Breaking News
              </motion.span>
              <span className="font-serif">•</span>
              <span className="font-serif">{leadStory.title}</span>
            </div>
          </motion.div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Lead story - spans 3 columns */}
          <motion.div 
            className="lg:col-span-3"
            variants={itemVariants}
          >
            <div className="border-b-2 border-ink-800 dark:border-newsprint-200 pb-4 mb-6">
              <motion.h1 
                className="newspaper-headline text-4xl md:text-6xl text-ink-900 dark:text-newsprint-100 mb-4 ink-bleed"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
              >
                {leadStory.title}
              </motion.h1>
              <motion.p 
                className="newspaper-subhead text-xl md:text-2xl text-ink-700 dark:text-newsprint-300 mb-4 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                {leadStory.excerpt}
              </motion.p>
              <motion.div 
                className="newspaper-byline text-ink-600 dark:text-newsprint-400 flex items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span>By {leadStory.author}</span>
                <span>•</span>
                <span>{leadStory.date}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Video size={14} />
                  Video Report
                </span>
              </motion.div>
            </div>
            
            {/* Lead story image */}
            <motion.div 
              className="aspect-video bg-ink-300 dark:bg-ink-700 rounded newsprint-shadow mb-6 overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={leadStory.image} 
                alt={leadStory.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            className="lg:col-span-1 space-y-8"
            variants={itemVariants}
          >
            {/* Quick News */}
            <div className="bg-ink-50 dark:bg-ink-800 p-6 rounded newsprint-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-ink-600 dark:text-newsprint-400" />
                <h3 className="newspaper-subhead text-lg text-ink-800 dark:text-newsprint-200">Latest Updates</h3>
              </div>
              <div className="space-y-3">
                {quickNews.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="border-b border-ink-200 dark:border-ink-600 last:border-b-0 pb-3 last:pb-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <h4 className="font-serif font-semibold text-sm text-ink-800 dark:text-newsprint-200 mb-1 leading-tight cursor-pointer hover:text-ink-600 dark:hover:text-newsprint-300 transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-newsprint-500">
                      <span>{item.time}</span>
                      <span>•</span>
                      <span className="newspaper-kicker">{item.category}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div className="bg-ink-50 dark:bg-ink-800 p-6 rounded newsprint-shadow">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-ink-600 dark:text-newsprint-400" />
                <h3 className="newspaper-subhead text-lg text-ink-800 dark:text-newsprint-200">Trending Now</h3>
              </div>
              <div className="space-y-3">
                {trending.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-start gap-3 cursor-pointer group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-xl font-bold text-ink-400 dark:text-newsprint-500 font-serif min-w-[24px]">{index + 1}</span>
                    <div className="flex-1">
                      <h4 className="font-serif font-semibold text-sm text-ink-800 dark:text-newsprint-200 group-hover:text-ink-600 dark:group-hover:text-newsprint-300 transition-colors leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-ink-500 dark:text-newsprint-500 mt-1">{item.reads} reads</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Featured Stories Section */}
        <motion.section className="mb-12" variants={itemVariants}>
          <div className="flex items-center mb-8">
            <h2 className="newspaper-headline text-3xl text-ink-900 dark:text-newsprint-100 ink-bleed">Featured Stories</h2>
            <div className="flex-1 h-px newspaper-rule ml-6"></div>
            <Globe size={20} className="text-ink-600 dark:text-newsprint-400 ml-4" />
          </div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
          >
            {featuredStories.map((story, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="newsprint-shadow rounded bg-yellow-50 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 overflow-hidden"
              >
                <ArticleCard {...story} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Video & Multimedia Section */}
        <motion.section className="mb-12" variants={itemVariants}>
          <div className="flex items-center mb-8">
            <h2 className="newspaper-headline text-3xl text-ink-900 dark:text-newsprint-100 ink-bleed">Video Journal</h2>
            <div className="flex-1 h-px newspaper-rule ml-6"></div>
            <Camera size={20} className="text-ink-600 dark:text-newsprint-400 ml-4" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              className="bg-ink-800 dark:bg-ink-900 aspect-video rounded newsprint-shadow flex items-center justify-center"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center text-newsprint-50">
                <motion.div 
                  className="w-20 h-20 bg-newsprint-50/20 rounded-full flex items-center justify-center mx-auto mb-6"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.7 }}
                >
                  <div className="w-0 h-0 border-l-[16px] border-l-newsprint-50 border-y-[12px] border-y-transparent ml-1"></div>
                </motion.div>
                <h3 className="newspaper-subhead text-2xl font-semibold mb-3">Featured Documentary</h3>
                <p className="text-newsprint-300 newspaper-body">Climate Crisis: The Turning Point</p>
                <p className="text-sm text-newsprint-400 mt-2">25 min • Exclusive Report</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
            >
              <h3 className="newspaper-subhead text-xl text-ink-900 dark:text-newsprint-100">Latest Videos</h3>
              <div className="space-y-4">
                {[
                  { title: "Parliament Live: Climate Emergency Debate", duration: "12:34", views: "15.2K", category: "Politics" },
                  { title: "Market Analysis: Post-Summit Economic Impact", duration: "8:15", views: "8.7K", category: "Business" },
                  { title: "Cultural Spotlight: London's Art Renaissance", duration: "6:42", views: "12.1K", category: "Culture" }
                ].map((video, index) => (
                  <motion.div 
                    key={index}
                    className="flex gap-4 group cursor-pointer"
                    variants={itemVariants}
                    whileHover={{ x: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-32 h-20 bg-ink-300 dark:bg-ink-600 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-ink-400 dark:group-hover:bg-ink-500 transition-colors">
                      <div className="w-0 h-0 border-l-[12px] border-l-ink-700 dark:border-l-newsprint-200 border-y-[8px] border-y-transparent ml-1"></div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-serif font-semibold text-sm text-ink-800 dark:text-newsprint-200 group-hover:text-ink-600 dark:group-hover:text-newsprint-300 transition-colors leading-tight mb-2">
                        {video.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-ink-600 dark:text-newsprint-400">
                        <span>{video.duration}</span>
                        <span>•</span>
                        <span>{video.views} views</span>
                        <span>•</span>
                        <span className="newspaper-kicker">{video.category}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>
      </motion.main>

      <Footer />
    </div>
  );
};

export default Index;
