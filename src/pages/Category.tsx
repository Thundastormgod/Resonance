import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '@/lib/sanity';
import { sanitizeText } from '@/lib/security';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArticleCardSkeleton } from '../components/SkeletonLoaders';
import { Calendar, User, Video, Clock, TrendingUp, Flame } from 'lucide-react';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { motion } from 'framer-motion';

interface Article {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  mainImage: SanityImageSource;
  excerpt: string;
  mediaType: 'standard' | 'video';
  readCount?: number;
  author: {
    name: string;
  };
  categories: {
    title: string;
    slug: { current: string };
  }[];
  body?: any[]; // For calculating read time
}

// Category configuration mapping URL slugs to display names and colors
const categoryConfig: Record<string, { title: string; description: string; icon?: string; color: string; accentColor: string }> = {
  'uk': { title: 'UK', description: 'Latest news and stories from across the United Kingdom', color: 'from-blue-900 to-blue-700', accentColor: 'bg-blue-900' },
  'world': { title: 'World', description: 'International news and global perspectives', color: 'from-green-800 to-green-600', accentColor: 'bg-green-800' },
  'comment': { title: 'Comment', description: 'Opinion pieces and editorial commentary', color: 'from-gray-700 to-gray-500', accentColor: 'bg-gray-700' },
  'life-style': { title: 'Life & Style', description: 'Culture, fashion, food, and lifestyle trends', color: 'from-pink-600 to-pink-400', accentColor: 'bg-pink-600' },
  'business-money': { title: 'Business & Money', description: 'Financial news, markets, and economic analysis', color: 'from-orange-700 to-orange-500', accentColor: 'bg-orange-700' },
  'sport': { title: 'Sport', description: 'Sports news, scores, and athlete profiles', color: 'from-red-700 to-red-500', accentColor: 'bg-red-700' },
  'culture': { title: 'Culture', description: 'Arts, entertainment, books, and cultural commentary', color: 'from-purple-700 to-purple-500', accentColor: 'bg-purple-700' },
  'travel': { title: 'Travel', description: 'Destinations, travel guides, and adventure stories', color: 'from-teal-700 to-teal-500', accentColor: 'bg-teal-700' },
  'videos': { title: 'Videos', description: 'Video reports and multimedia journalism', icon: '📹', color: 'from-red-600 to-pink-600', accentColor: 'bg-red-600' },
  'podcasts': { title: 'Podcasts', description: 'Audio stories and in-depth conversations', icon: '🎧', color: 'from-indigo-700 to-indigo-500', accentColor: 'bg-indigo-700' },
  'music': { title: 'Music', description: 'Music news, reviews, and artist features', icon: '🎵', color: 'from-violet-700 to-violet-500', accentColor: 'bg-violet-700' },
  'news-politics': { title: 'News & Politics', description: 'Political coverage and current affairs', color: 'from-slate-800 to-slate-600', accentColor: 'bg-slate-800' },
  'film-television': { title: 'Film & Television', description: 'Reviews, interviews, and entertainment news', color: 'from-amber-700 to-amber-500', accentColor: 'bg-amber-700' },
  'sports': { title: 'Sports', description: 'Comprehensive sports coverage', color: 'from-emerald-700 to-emerald-500', accentColor: 'bg-emerald-700' },
  'puzzles': { title: 'Puzzles', description: 'Brain teasers, crosswords, and games', color: 'from-cyan-700 to-cyan-500', accentColor: 'bg-cyan-700' },
  'magazines': { title: 'Magazines', description: 'Magazine-style features and long-form journalism', color: 'from-rose-700 to-rose-500', accentColor: 'bg-rose-700' },
  'trending': { title: 'Trending', description: 'Most popular and trending stories', color: 'from-yellow-600 to-orange-600', accentColor: 'bg-yellow-600' },
};

const Category: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryInfo = category ? categoryConfig[category] : null;

  // Calculate estimated read time based on word count
  const calculateReadTime = (text: string): number => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  // Check if article is recent (within last 24 hours)
  const isRecent = (publishedAt: string): boolean => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return new Date(publishedAt) > oneDayAgo;
  };

  // Check if article is trending (high view count)
  const isTrending = (readCount?: number): boolean => {
    return (readCount || 0) > 1000;
  };

  useEffect(() => {
    const fetchCategoryArticles = async () => {
      if (!category) return;

      setLoading(true);
      setError(null);

      try {
        let query = '';
        
        // Special handling for certain categories
        if (category === 'videos') {
          // Fetch articles with video mediaType
          query = `*[_type == "article" && mediaType == "video"] | order(publishedAt desc) {
            _id,
            title,
            slug,
            publishedAt,
            mainImage,
            excerpt,
            mediaType,
            readCount,
            body,
            author->{
              name
            },
            categories[]->{
              title,
              slug
            }
          }`;
        } else if (category === 'trending') {
          // Fetch articles sorted by read count
          query = `*[_type == "article" && readCount > 0] | order(readCount desc)[0...20] {
            _id,
            title,
            slug,
            publishedAt,
            mainImage,
            excerpt,
            mediaType,
            readCount,
            body,
            author->{
              name
            },
            categories[]->{
              title,
              slug
            }
          }`;
        } else {
          // Fetch articles by category
          const categoryTitle = categoryInfo?.title || category;
          query = `*[_type == "article" && references(*[_type == "category" && (title match "${categoryTitle}" || slug.current == "${category}")]._id)] | order(publishedAt desc) {
            _id,
            title,
            slug,
            publishedAt,
            mainImage,
            excerpt,
            mediaType,
            readCount,
            body,
            author->{
              name
            },
            categories[]->{
              title,
              slug
            }
          }`;
        }

        const fetchedArticles = await client.fetch<Article[]>(query);
        setArticles(fetchedArticles);
      } catch (err) {
        console.error('Error fetching category articles:', err);
        setError('Failed to load articles. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryArticles();
  }, [category, categoryInfo?.title]);

  if (!categoryInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-off-white">
        <Header />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold text-deep-navy mb-4">Category Not Found</h1>
            <p className="text-lg text-slate-gray mb-6">
              The category you're looking for doesn't exist.
            </p>
            <Link to="/" className="text-warm-gold hover:underline">
              Return to Homepage
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-off-white to-cream text-deep-navy font-sans">
      <Header />
      
      {/* Category Header with Gradient */}
      <div className={`bg-gradient-to-r ${categoryInfo.color} text-white py-12 md:py-16 shadow-lg`}>
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-4">
              {categoryInfo.icon && <span className="text-5xl md:text-6xl">{categoryInfo.icon}</span>}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold drop-shadow-lg">
                {categoryInfo.title}
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white/90 font-serif italic max-w-3xl">
              {categoryInfo.description}
            </p>
          </motion.div>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-warm-gold hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-serif font-bold text-deep-navy mb-4">
              No Articles Yet
            </h2>
            <p className="text-slate-gray mb-6">
              We haven't published any articles in this category yet. Check back soon!
            </p>
            <Link to="/" className="text-warm-gold hover:underline">
              Return to Homepage
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-gray">
                {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
              </div>
            </div>

            {/* Featured Article (First Article - Large)  */}
            {articles.length > 0 && (
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
              >
                <Link to={`/article/${articles[0].slug.current}`} className="block group">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                    {/* Featured Image with Overlay */}
                    <div className="relative h-96 md:h-[500px] overflow-hidden">
                      <img
                        src={urlFor(articles[0].mainImage).width(1200).height(600).url()}
                        alt={articles[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      
                      {/* Badges */}
                      <div className="absolute top-6 left-6 flex gap-2">
                        {articles[0].categories && articles[0].categories.length > 0 && (
                          <span className={`${categoryInfo.accentColor} text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-lg`}>
                            {articles[0].categories[0].title}
                          </span>
                        )}
                        {isRecent(articles[0].publishedAt) && (
                          <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full shadow-lg animate-pulse">
                            NEW
                          </span>
                        )}
                        {isTrending(articles[0].readCount) && (
                          <span className="bg-yellow-500 text-black text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-full shadow-lg flex items-center gap-1">
                            <Flame size={12} />
                            TRENDING
                          </span>
                        )}
                      </div>

                      {/* Video Indicator */}
                      {articles[0].mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:bg-white/30 transition-colors">
                            <Video className="h-16 w-16 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      )}

                      {/* Content Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                        <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-2xl group-hover:text-yellow-200 transition-colors">
                          {articles[0].title}
                        </h2>
                        <p
                          className="text-white/90 text-lg mb-6 line-clamp-2 drop-shadow-lg"
                          dangerouslySetInnerHTML={{ __html: sanitizeText(articles[0].excerpt) }}
                        />
                        
                        {/* Meta Information */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            <span className="font-medium">{articles[0].author?.name || 'Staff'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>
                              {new Date(articles[0].publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{calculateReadTime(articles[0].excerpt)} min read</span>
                          </div>
                          {isTrending(articles[0].readCount) && (
                            <div className="flex items-center gap-2">
                              <TrendingUp size={16} />
                              <span>{articles[0].readCount?.toLocaleString()} views</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.article>
            )}

            {/* Regular Article Grid (Remaining Articles) */}
            {articles.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles.slice(1).map((article, index) => (
                  <motion.article
                    key={article._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col"
                  >
                    {/* Article Image */}
                    <Link to={`/article/${article.slug.current}`} className="block group relative overflow-hidden">
                      <div className="relative h-56">
                        <img
                          src={urlFor(article.mainImage).width(600).height(400).url()}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Subtle Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Video Badge */}
                        {article.mediaType === 'video' && (
                          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold shadow-lg">
                            <Video size={12} />
                            VIDEO
                          </div>
                        )}

                        {/* New/Trending Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          {isRecent(article.publishedAt) && (
                            <span className="bg-red-600 text-white text-xs font-bold uppercase px-2 py-1 rounded shadow-lg">
                              NEW
                            </span>
                          )}
                          {isTrending(article.readCount) && (
                            <span className="bg-yellow-500 text-black text-xs font-bold uppercase px-2 py-1 rounded shadow-lg flex items-center gap-1">
                              <Flame size={10} />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Color-coded Border */}
                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${categoryInfo.accentColor}`} />
                      </div>
                    </Link>

                    {/* Article Content */}
                    <div className="p-6 flex-grow flex flex-col">
                      {/* Category Tag */}
                      {article.categories && article.categories.length > 0 && (
                        <div className="mb-3">
                          <span className={`${categoryInfo.accentColor} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full`}>
                            {article.categories[0].title}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="font-serif text-xl font-bold leading-tight text-deep-navy mb-3 line-clamp-3 hover:text-muted-burgundy transition-colors">
                        <Link to={`/article/${article.slug.current}`}>
                          {article.title}
                        </Link>
                      </h3>

                      {/* Excerpt */}
                      <p
                        className="text-slate-gray text-sm leading-relaxed mb-4 line-clamp-3 flex-grow"
                        dangerouslySetInnerHTML={{ __html: sanitizeText(article.excerpt) }}
                      />

                      {/* Meta Information */}
                      <div className="pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-gray">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <User size={12} className="flex-shrink-0" />
                            <span className="font-medium truncate">
                              {article.author?.name || 'Staff'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Clock size={12} />
                            <span className="whitespace-nowrap">{calculateReadTime(article.excerpt)} min</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-gray">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} />
                            <span className="whitespace-nowrap">
                              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          {isTrending(article.readCount) && (
                            <div className="flex items-center gap-1 text-yellow-600 font-medium">
                              <TrendingUp size={12} />
                              <span>{(article.readCount || 0) > 1000 ? `${Math.round((article.readCount || 0) / 1000)}k` : article.readCount} views</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Category;
