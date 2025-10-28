import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client, urlFor } from '@/lib/sanity';
import { sanitizeText } from '@/lib/security';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArticleCardSkeleton } from '../components/SkeletonLoaders';
import { Calendar, User, Video } from 'lucide-react';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';

interface Article {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
  mainImage: SanityImageSource;
  excerpt: string;
  mediaType: 'standard' | 'video';
  author: {
    name: string;
  };
  categories: {
    title: string;
    slug: { current: string };
  }[];
}

// Category configuration mapping URL slugs to display names
const categoryConfig: Record<string, { title: string; description: string; icon?: string }> = {
  'uk': { title: 'UK', description: 'Latest news and stories from across the United Kingdom' },
  'world': { title: 'World', description: 'International news and global perspectives' },
  'comment': { title: 'Comment', description: 'Opinion pieces and editorial commentary' },
  'life-style': { title: 'Life & Style', description: 'Culture, fashion, food, and lifestyle trends' },
  'business': { title: 'Business & Money', description: 'Financial news, markets, and economic analysis' },
  'sport': { title: 'Sport', description: 'Sports news, scores, and athlete profiles' },
  'culture': { title: 'Culture', description: 'Arts, entertainment, books, and cultural commentary' },
  'travel': { title: 'Travel', description: 'Destinations, travel guides, and adventure stories' },
  'videos': { title: 'Videos', description: 'Video reports and multimedia journalism', icon: '📹' },
  'podcasts': { title: 'Podcasts', description: 'Audio stories and in-depth conversations', icon: '🎧' },
  'music': { title: 'Music', description: 'Music news, reviews, and artist features', icon: '🎵' },
  'news-politics': { title: 'News & Politics', description: 'Political coverage and current affairs' },
  'film-television': { title: 'Film & Television', description: 'Reviews, interviews, and entertainment news' },
  'sports': { title: 'Sports', description: 'Comprehensive sports coverage' },
  'puzzles': { title: 'Puzzles', description: 'Brain teasers, crosswords, and games' },
  'magazines': { title: 'Magazines', description: 'Magazine-style features and long-form journalism' },
  'trending': { title: 'Trending', description: 'Most popular and trending stories' },
};

const Category: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryInfo = category ? categoryConfig[category] : null;

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
    <div className="min-h-screen flex flex-col bg-off-white text-deep-navy font-sans">
      <Header />
      
      {/* Category Header */}
      <div className="bg-cream border-b-2 border-ink-300 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center gap-3 mb-3">
            {categoryInfo.icon && <span className="text-4xl">{categoryInfo.icon}</span>}
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-deep-navy">
              {categoryInfo.title}
            </h1>
          </div>
          <p className="text-lg text-slate-gray font-serif italic">
            {categoryInfo.description}
          </p>
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
            <div className="mb-6 text-sm text-slate-gray">
              {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <article
                  key={article._id}
                  className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Image */}
                  <Link to={`/article/${article.slug.current}`} className="block group">
                    <div className="relative overflow-hidden">
                      <img
                        src={urlFor(article.mainImage).width(600).height(400).url()}
                        alt={article.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {article.mediaType === 'video' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Video className="h-12 w-12 text-white/80" />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-6">
                    {/* Category Tag */}
                    {article.categories && article.categories.length > 0 && (
                      <div className="mb-3">
                        <span className="inline-block bg-deep-navy text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                          {article.categories[0].title}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="font-serif text-xl font-bold leading-tight text-deep-navy mb-3">
                      <Link
                        to={`/article/${article.slug.current}`}
                        className="hover:text-muted-burgundy transition-colors"
                      >
                        {article.title}
                      </Link>
                    </h3>

                    {/* Excerpt */}
                    <p
                      className="text-slate-gray text-sm leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: sanitizeText(article.excerpt) }}
                    />

                    {/* Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-200 gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-gray">
                        <User size={12} className="flex-shrink-0" />
                        <span className="font-medium truncate">
                          By {article.author?.name || 'Staff'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-gray">
                        <Calendar size={12} className="flex-shrink-0" />
                        <span className="whitespace-nowrap">
                          {new Date(article.publishedAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Category;
