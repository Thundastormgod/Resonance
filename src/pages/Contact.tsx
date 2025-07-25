import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="bg-cream min-h-screen">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-deep-navy mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-gray-700 font-serif italic">
              Get in touch with The Resonance team
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deep-navy focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deep-navy focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deep-navy focus:border-transparent"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-deep-navy focus:border-transparent resize-vertical"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-deep-navy text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="text-deep-navy mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="text-gray-600">editorial@theresonance.news</p>
                      <p className="text-gray-600">tips@theresonance.news</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="text-deep-navy mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="text-gray-600">+234 (0) 123 456 7890</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="text-deep-navy mt-1" size={20} />
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <p className="text-gray-600">
                        The Resonance Newsroom<br />
                        Lagos, Nigeria
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-6">Office Hours</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Monday - Friday</span>
                    <span className="text-gray-900 font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Saturday</span>
                    <span className="text-gray-900 font-medium">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Sunday</span>
                    <span className="text-gray-900 font-medium">Closed</span>
                  </div>
                </div>
              </div>

              <div className="bg-deep-navy text-white p-8 rounded-lg">
                <h2 className="font-serif text-2xl font-bold mb-4">For Media Inquiries</h2>
                <p className="text-slate-gray mb-4">
                  Press releases, interview requests, and media partnerships.
                </p>
                <p className="font-medium">media@theresonance.news</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
