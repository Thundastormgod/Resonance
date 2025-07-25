import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Supabase removed - using Sanity as backend
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContentItem {
  id: string;
  title: string;
  category?: { name: string } | null;
}

const sectionConfig: { [key: string]: { title: string; type: 'articles' | 'videos' | 'images' } } = {
  lead: { title: 'Lead Story', type: 'articles' },
  featured: { title: 'Featured Stories', type: 'articles' },
  latest: { title: 'Latest Updates', type: 'articles' },
  trending: { title: 'Trending Now', type: 'articles' },
  videos: { title: 'Videos', type: 'videos' },
  images: { title: 'Image Galleries', type: 'images' },
};

const fetchContentForSection = async (section: string) => {
  const config = sectionConfig[section];
  if (!config) throw new Error('Invalid content section');

  // TODO: Replace with Sanity query when needed
  // Disabled Supabase - using Sanity as backend
  const data = [], error = null;
  if (error) throw new Error(error.message);

  const formattedData = data?.map(item => ({
    ...item,
    category: Array.isArray(item.category) ? item.category[0] : item.category,
  }));

  return formattedData as ContentItem[];
};

export default function ContentSection() {
  const { sectionType = '' } = useParams<{ sectionType: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = sectionConfig[sectionType] || { title: 'Content', type: 'articles' };

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['content-section', sectionType],
    queryFn: () => fetchContentForSection(sectionType),
    enabled: !!sectionType,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Replace with Sanity delete when needed
      const error = new Error('Delete disabled - using Sanity as backend');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Item deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['content-section', sectionType] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const handleDelete = (item: ContentItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading content...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-900 text-gray-200 rounded-lg">
      <Button variant="outline" onClick={() => navigate('/admin/dashboard')} className="bg-gray-800 border-gray-700 hover:bg-gray-700">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      <Card className="bg-gray-800/50 border-gray-700/80 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Manage {config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {items && items.length > 0 ? (
              items.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-gray-100 truncate" title={item.title}>{item.title}</p>
                    {item.category && <span className="text-xs text-indigo-400 mt-1 inline-block">{item.category.name}</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    {config.type === 'articles' && (
                      <Button asChild variant="outline" size="icon" className="h-9 w-9 bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300 hover:text-white">
                        <Link to={`/admin/articles/${item.id}/edit`}><Edit className="h-4 w-4" /></Link>
                      </Button>
                    )}
                    <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDelete(item)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-center text-gray-400 py-4">No content found in this section.</p>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
