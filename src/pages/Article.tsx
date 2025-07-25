import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { client, urlFor } from '@/lib/sanity';
import { validateSlug } from '@/lib/security';
import { PortableText, PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Loader2, Calendar, User } from 'lucide-react';

// Types
interface ArticleData {
  _id: string;
  title: string;
  publishedAt: string;
  mainImage: SanityImageSource;
  author: {
    name: string;
    image: SanityImageSource;
  };
  categories: {
    title: string;
  }[];
  body: PortableTextBlock[];
}

// Custom components for PortableText
const ptComponents: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      return (
        <img
          alt={value.alt || ' '}
          loading="lazy"
          src={urlFor(value).width(800).auto('format').url()}
          className="rounded-lg my-8 shadow-md" 
        />
      );
    },
  },
  block: {
    h1: ({ children }) => <h1 className="text-4xl font-bold font-serif my-6 text-deep-navy">{children}</h1>,
    h2: ({ children }) => <h2 className="text-3xl font-bold font-serif my-5 text-deep-navy">{children}</h2>,
    h3: ({ children }) => <h3 className="text-2xl font-bold font-serif my-4 text-deep-navy">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-warm-gold pl-4 my-6 italic text-slate-gray">{children}</blockquote>,
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value.href} target="_blank" rel="noopener noreferrer" className="text-warm-gold hover:underline">
        {children}
      </a>
    ),
  },
};

// Data fetching function
const ARTICLE_QUERY = `*[_type == "article" && slug.current == $slug][0]{
  _id, 
  title, 
  publishedAt, 
  mainImage,
  "author": author->{name, image},
  "categories": categories[]->{title},
  body
}`;

const fetchArticle = async (slug: string): Promise<ArticleData> => {
  const data = await client.fetch(ARTICLE_QUERY, { slug });
  return data;
};

const Article = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!validateSlug(slug)) {
    return <div className="text-red-500 text-center p-8 bg-off-white">Invalid article slug.</div>;
  }

  const { data: article, isLoading, error } = useQuery<ArticleData, Error>({
    queryKey: ['article', slug],
    queryFn: () => fetchArticle(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-off-white">
        <Loader2 className="h-16 w-16 animate-spin text-warm-gold" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-8 bg-off-white">Error loading article: {error.message}</div>;
  }

  if (!article) {
    return <div className="text-center p-8 bg-off-white">Article not found.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-deep-navy font-sans">
      <Header />
      <main className="flex-grow">
        <article>
          {/* Article Header */}
          <header className="text-center pt-16 pb-12 bg-white">
            <div className="container mx-auto max-w-4xl px-4">
              <div className="flex justify-center gap-2 mb-4">
                {article.categories?.map(cat => (
                  <span key={cat.title} className="text-sm font-sans uppercase text-warm-gold tracking-wider">{cat.title}</span>
                ))}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold font-serif text-deep-navy mb-6">{article.title}</h1>
              <div className="flex justify-center items-center gap-6 text-slate-gray font-sans">
                <div className="flex items-center gap-2">
                  {article.author.image ? (
                    <img src={urlFor(article.author.image).width(40).height(40).url()} alt={article.author.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : <User className="w-6 h-6"/>}
                  <span>{article.author.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                </div>
              </div>
            </div>
          </header>

          {/* Main Image */}
          {article.mainImage && (
            <div className="container mx-auto my-8 md:-my-16 relative z-10 px-4">
                <img src={urlFor(article.mainImage).width(1200).height(675).url()} alt={article.title} className="w-full h-auto object-cover rounded-lg shadow-2xl"/>
            </div>
          )}

          {/* Article Body */}
          <div className="container mx-auto max-w-3xl p-8 pt-16 md:pt-24 leading-relaxed text-lg">
            <PortableText value={article.body} components={ptComponents} />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Article;
