// Enhanced Article Rendering Section for Category.tsx
// Replace the articles.map section (around line 240) with this code:

<>
  <div className="mb-8 flex items-center justify-between">
    <div className="text-sm font-medium text-slate-gray">
      {articles.length} {articles.length === 1 ? 'article' : 'articles'} found
    </div>
  </div>

  {/* Featured Article (First Article - Large) */}
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
