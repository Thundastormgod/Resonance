
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Mail, MapPin, Phone, Users } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              About The Resonance
            </h1>
            <p className="text-xl text-gray-700 font-serif italic">
              Where Stories Echo Through Time
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-lg leading-relaxed text-gray-700 mb-4">
                  The Resonance was founded on the belief that exceptional storytelling has the power to create 
                  understanding, inspire change, and connect people across all boundaries. In an age of information 
                  overload, we curate and create content that matters—stories that resonate long after you've 
                  finished reading.
                </p>
                <p className="text-lg leading-relaxed text-gray-700">
                  Our newsroom combines traditional journalistic rigor with innovative multimedia storytelling, 
                  bringing you in-depth features, breaking news analysis, and thought-provoking opinion pieces 
                  that illuminate the complexities of our interconnected world.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Our Approach</h2>
                <p className="text-lg leading-relaxed text-gray-700 mb-4">
                  We believe in the power of slow journalism—taking the time to deeply investigate, thoughtfully 
                  analyze, and beautifully present the stories that shape our world. Our multimedia approach 
                  combines compelling writing with striking photography, immersive video documentaries, and 
                  interactive digital experiences.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-semibold mb-2">Deep Reporting</h3>
                    <p className="text-gray-600">Comprehensive investigations that uncover the full story</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-semibold mb-2">Multimedia Storytelling</h3>
                    <p className="text-gray-600">Rich visual narratives that bring stories to life</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-semibold mb-2">Global Perspective</h3>
                    <p className="text-gray-600">International coverage with local insight and context</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-serif text-lg font-semibold mb-2">Thoughtful Analysis</h3>
                    <p className="text-gray-600">Expert commentary that adds depth and understanding</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4">Our Team</h2>
                <p className="text-lg leading-relaxed text-gray-700 mb-6">
                  The Resonance is powered by a diverse team of journalists, photographers, videographers, 
                  and digital storytellers from around the world. Our contributors bring unique perspectives 
                  and expertise from their respective fields and regions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
                    <h3 className="font-serif text-lg font-semibold">Sarah Chen</h3>
                    <p className="text-gray-600">Editor-in-Chief</p>
                    <p className="text-sm text-gray-500 mt-2">Former Reuters correspondent with 15 years covering technology and society</p>
                  </div>
                  <div className="text-center">
                    <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4"></div>
                    <h3 className="font-serif text-lg font-semibold">Marcus Rodriguez</h3>
                    <p className="text-gray-600">Environmental Correspondent</p>
                    <p className="text-sm text-gray-500 mt-2">Award-winning climate journalist and documentary filmmaker</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Contact Us
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail size={16} />
                    <span className="text-sm">editorial@theresonance.com</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} />
                    <span className="text-sm">+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} />
                    <span className="text-sm">New York, NY</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="font-serif text-lg font-bold mb-4">Subscribe</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get our weekly digest of the most important stories, delivered every Sunday.
                </p>
                <form className="space-y-3">
                  <input 
                    type="email" 
                    placeholder="Your email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <button className="w-full bg-gray-900 text-white py-2 rounded-md hover:bg-gray-800 transition-colors">
                    Subscribe
                  </button>
                </form>
              </div>

              <div className="bg-gray-900 text-white p-6 rounded-lg">
                <h3 className="font-serif text-lg font-bold mb-4">Awards & Recognition</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-semibold">2024 Digital Journalism Award</div>
                    <div className="text-gray-300">Best Multimedia Feature</div>
                  </div>
                  <div>
                    <div className="font-semibold">2023 Press Club Award</div>
                    <div className="text-gray-300">Excellence in Online Publishing</div>
                  </div>
                  <div>
                    <div className="font-semibold">2023 Society of Publishers</div>
                    <div className="text-gray-300">Innovation in Digital Storytelling</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
