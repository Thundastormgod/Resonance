import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { client, urlFor, createLiveQuery, createPollingQuery, forceRefreshArticles } from '@/lib/sanity';
import { sanitizeText, validateSlug } from '@/lib/security';
import { getSafeArticleSelections, ValidationResult } from '@/lib/articleValidation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Loader2, Video, Clock, TrendingUp, User, Calendar } from 'lucide-react';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { formatDistanceToNow } from 'date-fns';

// Types
interface Article {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  mainImage: SanityImageSource;
  excerpt: string;
  isLeadStory: boolean;
  isFeatured: boolean;
  isBreakingNews: boolean;
  readCount: number;
  mediaType: 'standard' | 'video';
  author: {
    name: string;
  };
  categories: {
    title: string;
  }[];
  isLatestUpdate: boolean;
}

const query = `*[_type == "article"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  publishedAt,
  mainImage,
  excerpt,
  isLeadStory,
  isFeatured,
  isBreakingNews,
  readCount,
  mediaType,
  author->{
    name,
  },
  categories[]->{
    title,
  },
  isLatestUpdate
}`;

const Index = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live' | 'polling' | 'offline'>('connecting');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [forceRefreshCount, setForceRefreshCount] = useState(0);
  const pollingQueryRef = useRef<ReturnType<typeof createPollingQuery> | null>(null);
  const liveQueryRef = useRef<any>(null);
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    const fetchArticles = async (useForceRefresh = false) => {
      setLoading(true);
      try {
        let fetchedArticles: Article[];
        
        if (useForceRefresh) {
          console.log('🚀 Using force refresh for immediate update');
          fetchedArticles = await forceRefreshArticles<Article>(query);
          setForceRefreshCount(prev => prev + 1);
        } else {
          fetchedArticles = await client.fetch<Article[]>(query);
        }
        
        console.log('Fetched articles:', fetchedArticles);
        console.log('Articles with readCount:', fetchedArticles.filter(a => a.readCount));
        console.log('Articles with isLatestUpdate:', fetchedArticles.filter(a => a.isLatestUpdate));
        setArticles(fetchedArticles);
        setLastUpdated(new Date());
        lastRefreshRef.current = Date.now();
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      }
      setLoading(false);
    };

    // Initial fetch
    fetchArticles();

    // Set up real-time updates with multiple fallback strategies
    const setupRealTimeUpdates = () => {
      // Strategy 1: Try Sanity's live query (real-time)
      try {
        const liveQuery = createLiveQuery<Article>(query);
        liveQueryRef.current = liveQuery.listen(
          (updatedArticles) => {
            console.log('🔴 Live update received:', updatedArticles.length, 'articles');
            setArticles(updatedArticles as Article[]);
            setLastUpdated(new Date());
            setIsLiveMode(true);
            setConnectionStatus('live');
            lastRefreshRef.current = Date.now();
            
            // Force immediate refresh if lead story or breaking news changes detected
            const hasLeadOrBreaking = (updatedArticles as Article[]).some(a => a.isLeadStory || a.isBreakingNews);
            if (hasLeadOrBreaking) {
              console.log('🚀 Lead/Breaking news change detected, forcing immediate refresh');
              setTimeout(() => fetchArticles(true), 100); // Small delay to ensure backend is updated
            }
          },
          (error) => {
            console.warn('Live query failed, falling back to polling:', error);
            setIsLiveMode(false);
            setConnectionStatus('polling');
            // Fallback to polling if live query fails
            setupPolling();
          }
        );
      } catch (error) {
        console.warn('Live query setup failed, using polling:', error);
        setupPolling();
      }
    };

    // Strategy 2: Polling fallback (every 30 seconds)
    const setupPolling = () => {
      if (pollingQueryRef.current?.isActive()) {
        return; // Already polling
      }
      
      // Reduced polling interval for immediate responsiveness (10 seconds)
      pollingQueryRef.current = createPollingQuery<Article>(query, {}, 10000);
      pollingQueryRef.current.start(
        (updatedArticles) => {
          console.log('🟡 Polling update received:', updatedArticles.length, 'articles');
          setArticles(updatedArticles as Article[]);
          setLastUpdated(new Date());
          setConnectionStatus('polling');
          lastRefreshRef.current = Date.now();
          
          // Check if this is a significant change (lead story or breaking news)
          const hasLeadOrBreaking = (updatedArticles as Article[]).some(a => a.isLeadStory || a.isBreakingNews);
          if (hasLeadOrBreaking && Date.now() - lastRefreshRef.current > 5000) {
            console.log('🚀 Significant change detected, triggering force refresh');
            setTimeout(() => fetchArticles(true), 200);
          }
        },
        (error) => {
          console.error('Polling query error:', error);
          setConnectionStatus('offline');
        }
      );
    };

    // Start real-time updates after initial fetch
    setupRealTimeUpdates();

    // Cleanup function
    return () => {
      if (liveQueryRef.current && typeof liveQueryRef.current.unsubscribe === 'function') {
        liveQueryRef.current.unsubscribe();
      }
      if (pollingQueryRef.current) {
        pollingQueryRef.current.stop();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex justify-center items-center">
        <Loader2 className="h-16 w-16 animate-spin text-warm-gold" />
      </div>
    );
  }

  // 🔒 STRONG ENFORCEMENT: Use validation utility to enforce all rules
  const safeSelections = getSafeArticleSelections(articles);
  const {
    breakingNewsArticle,
    leadStory,
    featuredArticles,
    latestUpdates,
    videoArticles,
    trendingArticles,
    validation
  } = safeSelections;
  
  // Update validation state for UI display
  if (validation && JSON.stringify(validation) !== JSON.stringify(validationResult)) {
    setValidationResult(validation);
  }
  
  // 🔒 STRICT ENFORCEMENT: No fallback logic - only properly tagged articles are displayed
  // If no articles are tagged for a section, that section will be empty
  
  console.log('🔒 ENFORCED SELECTIONS:');
  console.log('- Breaking News:', breakingNewsArticle?.title || 'None');
  console.log('- Lead Story:', leadStory?.title || 'None');
  console.log('- Featured Articles:', featuredArticles.length);
  console.log('- Latest Updates:', latestUpdates.length);
  console.log('- Video Articles:', videoArticles.length);
  console.log('- Trending Articles:', trendingArticles.length);

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-deep-navy font-sans">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {/* Breaking News Banner */}
        {breakingNewsArticle && (
          <section className="mb-6">
            <Link to={`/article/${breakingNewsArticle.slug.current}`} className="block bg-red-600 text-white p-3 rounded-md hover:bg-opacity-90 transition-colors">
              <span className="font-bold uppercase text-sm tracking-wider">Breaking News</span>
               <span className="mx-2">•</span>
               <span>{breakingNewsArticle.title}</span>
            </Link>
          </section>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Lead Story */}
            {leadStory && (
              <section className="homepage-section bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300">
                <h1 className="font-serif text-4xl md:text-6xl font-bold text-deep-navy mb-4 leading-tight">{leadStory.title}</h1>
                <div className="mb-4 text-xs uppercase text-slate-gray tracking-wider font-medium flex items-center gap-4">
                  <span>By {leadStory.author?.name || 'Staff'}</span>
                  <span className="text-gray-400">•</span>
                  <span>{new Date(leadStory.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  {leadStory.mediaType === 'video' && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="flex items-center gap-1.5"><Video size={14}/> Video Report</span>
                    </>
                  )}
                </div>
                <p className="text-lg text-slate-gray mb-4" dangerouslySetInnerHTML={{ __html: sanitizeText(leadStory.excerpt) }}></p>
                <Link to={`/article/${leadStory.slug.current}`} className="block group mt-6">
                  <div className="overflow-hidden rounded-lg shadow-lg">
                    <img src={urlFor(leadStory.mainImage).width(1200).height(675).url()} alt={leadStory.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"/>
                  </div>
                </Link>
              </section>
            )}

            {/* Featured Stories */}
            {featuredArticles && featuredArticles.length > 0 && (
              <section className="homepage-section bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-serif text-3xl font-bold text-deep-navy">Featured Stories</h2>
                  <div className="w-8 h-8 rounded-full border-2 border-deep-navy flex items-center justify-center">
                    <span className="text-deep-navy font-bold text-sm">→</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featuredArticles.map((article) => (
                    <article key={article._id} className="bg-cream rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                      {/* Category Tag */}
                      <div className="p-4 pb-0">
                        <span className="inline-block bg-deep-navy text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                          {article.categories?.[0]?.title || 'FEATURES'}
                        </span>
                      </div>
                      
                      {/* Image */}
                      <div className="p-4 pt-3">
                        <div className="overflow-hidden rounded-lg mb-4">
                          <Link to={`/article/${article.slug.current}`} className="block group">
                            <img 
                              src={urlFor(article.mainImage).width(600).height(400).url()} 
                              alt={article.title} 
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </Link>
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-3">
                          <h3 className="font-serif text-xl font-bold leading-tight text-deep-navy">
                            <Link to={`/article/${article.slug.current}`} className="hover:text-muted-burgundy transition-colors">
                              {article.title}
                            </Link>
                          </h3>
                          
                          <p className="text-slate-gray text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeText(article.excerpt) }}></p>
                          
                          {/* Author and Date */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-xs text-slate-gray">
                              <User size={12}/>
                              <span className="font-medium">By {article.author?.name || 'Staff'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-gray">
                              <Calendar size={12}/>
                              <span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                          
                          {/* Continue Reading Link */}
                          <div className="pt-2">
                            <Link 
                              to={`/article/${article.slug.current}`} 
                              className="inline-flex items-center gap-2 text-sm font-medium text-deep-navy hover:text-muted-burgundy transition-colors"
                            >
                              Continue Reading
                              <span className="text-xs">→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
            {/* Trending Section */}
            {trendingArticles && trendingArticles.length > 0 && (
              <div className="mb-8 border-b border-gray-200 pb-8">
                <h2 className="text-xl font-bold mb-4">Trending</h2>
                {trendingArticles.map((article, index) => (
                  <div key={article._id} className="flex items-start gap-3 border-b border-gray-200 pb-3 last:border-b-0">
                    <span className="text-2xl font-bold text-slate-gray font-serif pt-1">{index + 1}</span>
                    <div className='flex-grow'>
                      <Link to={`/article/${article.slug.current}`} className="group">
                        <h3 className="font-semibold group-hover:text-muted-burgundy transition-colors leading-tight">{article.title}</h3>
                        <p className="text-xs text-slate-gray mt-1">{article.readCount ? `${(article.readCount / 1000).toFixed(1)}K reads` : 'Popular'}</p>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Latest Updates Section - Only shows articles tagged as isLatestUpdate */}
            {latestUpdates && latestUpdates.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Latest Updates</h2>
                {latestUpdates.map((article) => (
                  <div key={article._id} className="border-b border-gray-200 pb-3 last:border-b-0 mb-3">
                    <Link to={`/article/${article.slug.current}`} className="group block">
                      <h3 className="font-semibold group-hover:text-muted-burgundy transition-colors leading-tight">{article.title}</h3>
                      <div className="text-xs text-slate-gray mt-1 flex items-center gap-2">
                        <span>{formatDistanceToNow(new Date(article.publishedAt))} ago</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium uppercase">{article.categories?.[0]?.title || 'News'}</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Video Journal */}
        {videoArticles && videoArticles.length > 0 && (
          <section className="homepage-section mt-12 bg-white p-6 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="border-b-2 border-gray-200 pb-2 mb-6">
              <h2 className="font-serif text-sm font-bold text-deep-navy uppercase tracking-wider">Video Journal</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Link to={`/article/${videoArticles[0].slug.current}`} className="block group">
                  <div className="relative overflow-hidden rounded-lg shadow-lg">
                    <img src={urlFor(videoArticles[0].mainImage).width(1200).height(675).url()} alt={videoArticles[0].title} className="w-full h-auto object-cover"/>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Video className="h-20 w-20 text-white/80 group-hover:scale-110 transition-transform duration-300"/>
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl font-bold mt-4 group-hover:text-muted-burgundy transition-colors">{videoArticles[0].title}</h3>
                  <p className="text-slate-gray text-sm" dangerouslySetInnerHTML={{ __html: sanitizeText(videoArticles[0].excerpt) }}></p>
                </Link>
              </div>
              <div className="lg:col-span-1">
                <h3 className="text-lg font-bold mb-3 font-serif">Latest Videos</h3>
                <ul className="space-y-4">
                  {videoArticles.slice(1).map((article) => (
                    <li key={article._id}>
                      <Link to={`/article/${article.slug.current}`} className="group flex items-center gap-4">
                        <div className="relative flex-shrink-0 w-32 h-20 overflow-hidden rounded-md shadow-sm">
                          <img src={urlFor(article.mainImage).width(200).height(120).url()} alt={article.title} className="w-full h-full object-cover"/>
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Video className="h-8 w-8 text-white/80"/>
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm leading-tight group-hover:text-muted-burgundy transition-colors">{article.title}</h4>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
