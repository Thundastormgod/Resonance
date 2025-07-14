import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Star, Zap, TrendingUp, Video as VideoIcon, Image as ImageIcon, ArrowRight } from 'lucide-react';

const contentSections = [
  { title: 'Lead Story', icon: <Newspaper />, link: '/admin/content/lead', description: 'Manage the main headline article.' },
  { title: 'Featured Stories', icon: <Star />, link: '/admin/content/featured', description: 'Curate your top featured articles.' },
  { title: 'Latest Updates', icon: <Zap />, link: '/admin/content/latest', description: 'View and manage the newest posts.' },
  { title: 'Trending Now', icon: <TrendingUp />, link: '/admin/content/trending', description: 'Control the list of trending topics.' },
  { title: 'Videos', icon: <VideoIcon />, link: '/admin/content/videos', description: 'Add or remove videos.' },
  { title: 'Image Galleries', icon: <ImageIcon />, link: '/admin/content/images', description: 'Manage image galleries.' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-900 text-gray-200 rounded-lg">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Content Management</h1>
        <p className="text-gray-400 mt-1">Select a section to manage its content.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentSections.map((section) => (
          <Link to={section.link} key={section.title} className="block hover:no-underline">
            <Card className="bg-gray-800/50 border-gray-700/80 shadow-lg h-full flex flex-col hover:bg-gray-800/80 hover:border-indigo-500 transition-all duration-300 group">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center space-x-3 text-gray-200">
                  {section.icon}
                  <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <p className="text-sm text-gray-400 mb-4">{section.description}</p>
                <div className="flex items-center justify-end text-sm font-semibold text-indigo-400 group-hover:text-white">
                  Manage Section
                  <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

