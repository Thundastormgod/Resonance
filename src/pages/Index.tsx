import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import Header from '../components/Header';
import ArticleCard from '../components/ArticleCard';
import Footer from '../components/Footer';
import { Clock, TrendingUp, Globe, Video, Camera, Loader2 } from 'lucide-react';

// Types
interface Article {
  id: string;
  title: string;
  content: string;
  created_at: string;
  image_url: string | null;
  video_url?: string | null;
  authors: { name: string }[] | null;
  categories: { name: string }[] | null;
}

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="flex items-center mb-6">
    <h2 className="newspaper-headline text-3xl text-ink-900 dark:text-newsprint-100 ink-bleed">{title}</h2>
    <div className="flex-1 h-px newspaper-rule ml-6"></div>
    <div className="text-ink-600 dark:text-newsprint-400 ml-4">
      {icon}
    </div>
  </div>
);

// Data fetching function
const fetchArticles = async (section: 'lead' | 'featured' | 'latest') => {
  let query = supabase
    .from('articles')
    .select('id, title, content, created_at, image_url, video_url, authors(name), categories(name)')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (section === 'lead') {
    query = query.eq('is_lead_story', true).limit(1);
  } else if (section === 'featured') {
    query = query.eq('is_featured', true).limit(4);
  } else {
    query = query.limit(5);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Article[];
};

const Index = () => {
  const { data: leadStoryData, isLoading: isLoadingLead } = useQuery({ 
    queryKey: ['articles', 'lead'], 
    queryFn: () => fetchArticles('lead') 
  });
  const { data: featuredStories, isLoading: isLoadingFeatured } = useQuery({ 
    queryKey: ['articles', 'featured'], 
    queryFn: () => fetchArticles('featured') 
  });
  const { data: latestStories, isLoading: isLoadingLatest } = useQuery({ 
    queryKey: ['articles', 'latest'], 
    queryFn: () => fetchArticles('latest') 
  });

  const leadStory = leadStoryData?.[0];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const isLoading = isLoadingLead || isLoadingFeatured || isLoadingLatest;

  const trending = [
    { title: 'Understanding the new off-side rule in soccer', date: '3h ago' },
    { title: 'The 10 best-dressed celebrities at the Met Gala', date: '22h ago' },
    { title: 'Is the four-day work week the future?', date: '2d ago' },
    { title: 'A guide to the latest smartphone releases', date: '1d ago' },
  ];

  return (
    <div className="min-h-screen newspaper-texture transition-colors duration-300">
      <Header />
      
      <motion.main
        className="container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-ink-500" />
          </div>
        ) : (
          <>
            <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12" variants={itemVariants}>
              <div className="lg:col-span-2">
                {leadStory && (
                  <ArticleCard 
                    isLead
                    title={leadStory.title}
                    excerpt={leadStory.content.substring(0, 200) + '...'}
                    author={leadStory.authors?.[0]?.name || 'N/A'}
                    date={formatDistanceToNow(new Date(leadStory.created_at)) + ' ago'}
                    category={leadStory.categories?.[0]?.name || 'N/A'}
                    image={leadStory.image_url || undefined}
                    hasVideo={!!leadStory.video_url}
                  />
                )}
              </div>
              <div className="flex flex-col justify-between space-y-6">
                {featuredStories?.slice(0, 1).map((story) => (
                  <ArticleCard 
                    key={story.id}
                    title={story.title}
                    excerpt={story.content.substring(0, 100) + '...'}
                    author={story.authors?.[0]?.name || 'N/A'}
                    date={formatDistanceToNow(new Date(story.created_at)) + ' ago'}
                    category={story.categories?.[0]?.name || 'N/A'}
                    image={story.image_url || undefined}
                    hasVideo={!!story.video_url}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div className="mb-12" variants={itemVariants}>
              <SectionHeader title="Featured Stories" icon={<Globe />} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredStories?.slice(1).map((story) => (
                  <ArticleCard 
                    key={story.id}
                    title={story.title}
                    excerpt={story.content.substring(0, 100) + '...'}
                    author={story.authors?.[0]?.name || 'N/A'}
                    date={formatDistanceToNow(new Date(story.created_at)) + ' ago'}
                    category={story.categories?.[0]?.name || 'N/A'}
                    image={story.image_url || undefined}
                    hasVideo={!!story.video_url}
                  />
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <SectionHeader title="Latest Updates" icon={<Clock />} />
                <div className="space-y-8">
                  {latestStories?.map((story) => (
                    <ArticleCard 
                      key={story.id}
                      title={story.title}
                      excerpt={story.content.substring(0, 150) + '...'}
                      author={story.authors?.[0]?.name || 'N/A'}
                      date={formatDistanceToNow(new Date(story.created_at)) + ' ago'}
                      category={story.categories?.[0]?.name || 'N/A'}
                      image={story.image_url || undefined}
                      hasVideo={!!story.video_url}
                    />
                  ))}
                </div>
              </div>

              <div>
                <SectionHeader title="Trending Now" icon={<TrendingUp />} />
                <div className="space-y-4">
                  {trending.map((item, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <span className="text-2xl font-bold text-newsprint-400 mr-4">{index + 1}</span>
                      <div>
                        <p className="font-semibold text-ink-800 dark:text-newsprint-200">{item.title}</p>
                        <p className="text-newsprint-500 font-serif">{item.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12">
                  <SectionHeader title="Video & Photos" icon={<Camera />} />
                  <div className="space-y-4">
                    <div className="aspect-video bg-ink-800 rounded-lg flex items-center justify-center text-newsprint-50">
                      <Video size={48} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-square bg-ink-300 rounded"></div>
                      <div className="aspect-square bg-ink-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.main>

      <Footer />
    </div>
  );
};

export default Index;
