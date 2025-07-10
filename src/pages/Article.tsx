
import Header from '../components/Header';
import Footer from '../components/Footer';
import PullQuote from '../components/PullQuote';
import { Clock, User, Share2, Bookmark } from 'lucide-react';

const Article = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          {/* Article header */}
          <header className="mb-8">
            <div className="mb-4">
              <span className="inline-block bg-gray-900 text-white px-3 py-1 text-sm font-sans uppercase tracking-wide">
                Features
              </span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              The Digital Renaissance: How Technology is Reshaping Human Connection
            </h1>
            
            <div className="text-lg text-gray-700 font-medium mb-6 leading-relaxed">
              In an era where virtual interactions have become as meaningful as physical presence, 
              we explore the profound ways technology is redefining what it means to be connected 
              in the 21st century.
            </div>
            
            <div className="flex items-center justify-between border-t border-b border-gray-300 py-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <span className="font-serif">By Sarah Chen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="font-serif">December 15, 2024</span>
                </div>
                <span className="text-gray-600">8 min read</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Share2 size={20} className="cursor-pointer hover:text-gray-700" />
                <Bookmark size={20} className="cursor-pointer hover:text-gray-700" />
              </div>
            </div>
          </header>

          {/* Lead image */}
          <div className="mb-8">
            <img 
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop"
              alt="Digital connections visualization"
              className="w-full h-96 object-cover rounded-lg"
            />
            <figcaption className="text-sm text-gray-600 mt-2 italic">
              A visualization of digital connections spanning the globe, representing the new landscape of human interaction.
            </figcaption>
          </div>

          {/* Article content */}
          <div className="prose prose-lg max-w-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <p className="text-lg leading-relaxed">
                  The morning sun streams through Maria's apartment window in Barcelona as she adjusts her laptop camera. 
                  In moments, she'll be having coffee with her best friend in Tokyo, attending a book club meeting with 
                  readers from five different continents, and collaborating on a research project with colleagues she's 
                  never met in person but knows intimately through years of digital collaboration.
                </p>

                <p className="text-lg leading-relaxed">
                  This is not science fiction—this is the new reality of human connection in the digital age. We are 
                  living through what historians may one day call the Digital Renaissance, a period of unprecedented 
                  transformation in how we form relationships, build communities, and create meaning together across 
                  vast distances and cultural boundaries.
                </p>

                <PullQuote 
                  quote="We are not replacing human connection with technology; we are expanding the very definition of what it means to be present with another person."
                  author="Dr. Sherry Turkle, MIT"
                />

                <p className="text-lg leading-relaxed">
                  The statistics tell a remarkable story. According to recent research from the Digital Society Institute, 
                  the average person now maintains meaningful relationships with 40% more people than they did a decade ago. 
                  These aren't superficial social media connections—these are deep, sustained relationships that cross 
                  geographical, cultural, and economic boundaries in ways that were impossible before.
                </p>

                <div className="my-8">
                  <img 
                    src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop"
                    alt="People connecting across devices"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <figcaption className="text-sm text-gray-600 mt-2 italic">
                    Remote work and digital collaboration have redefined professional relationships and teamwork.
                  </figcaption>
                </div>

                <p className="text-lg leading-relaxed">
                  But perhaps the most profound change isn't in the quantity of our connections—it's in their quality. 
                  Dr. Elena Rodriguez, who leads the Stanford Social Connection Lab, has been studying this phenomenon 
                  for the past five years. Her findings challenge many assumptions about digital relationships.
                </p>

                <p className="text-lg leading-relaxed">
                  "What we're seeing is that digital-first relationships often develop faster emotional intimacy than 
                  traditional in-person relationships," Rodriguez explains. "When you strip away physical presence, 
                  people tend to be more vulnerable, more authentic. They share their thoughts and feelings more readily."
                </p>

                <p className="text-lg leading-relaxed">
                  This vulnerability breeds connection. In online communities, people discuss mental health struggles, 
                  career transitions, and personal growth with an openness that might take months or years to develop 
                  in traditional settings. The result is a new form of intimacy—one built on shared ideas and experiences 
                  rather than shared geography.
                </p>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4">
                <div className="sticky top-8 space-y-8">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-bold mb-4">Key Statistics</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="font-semibold">40%</div>
                        <div className="text-sm text-gray-600">Increase in meaningful relationships</div>
                      </div>
                      <div>
                        <div className="font-semibold">3.2 billion</div>
                        <div className="text-sm text-gray-600">People in online communities</div>
                      </div>
                      <div>
                        <div className="font-semibold">67%</div>
                        <div className="text-sm text-gray-600">Report deeper digital friendships</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-bold mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-serif font-semibold text-sm leading-tight">
                          The Psychology of Virtual Presence
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">How our brains adapt to digital interaction</p>
                      </div>
                      <div>
                        <h4 className="font-serif font-semibold text-sm leading-tight">
                          Building Communities in Cyberspace
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">The new rules of online social architecture</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default Article;
