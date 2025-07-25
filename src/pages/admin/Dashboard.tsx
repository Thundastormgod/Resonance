import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, Star, Zap, Edit, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Article {
  id: string;
  title: string;
  created_at: string;
}

const sectionConfig = {
  lead: { title: 'Lead Story', icon: <Newspaper />, query: (q: any) => q.eq('is_lead_story', true) },
  featured: { title: 'Featured Stories', icon: <Star />, query: (q: any) => q.eq('is_featured', true) },
  latest: { title: 'Latest Updates', icon: <Zap />, query: (q: any) => q.order('created_at', { ascending: false }).limit(5) },
};

// Fetcher
const fetchArticlesForSection = async (section: keyof typeof sectionConfig) => {
  let query = supabase.from('articles').select('id, title, created_at');
  query = sectionConfig[section].query(query);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Article[];
};

// Article List Component
const ArticleListSection = ({ sectionKey }: { sectionKey: keyof typeof sectionConfig }) => {
  const queryClient = useQueryClient();
  const config = sectionConfig[sectionKey];

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ['dashboard-articles', sectionKey],
    queryFn: () => fetchArticlesForSection(sectionKey),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Article deleted!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-articles', sectionKey] });
    },
    onError: (err: Error) => toast.error(`Deletion failed: ${err.message}`),
  });

  return (
    <Card className="bg-gray-800/50 border-gray-700/80 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3 text-gray-200">
          {config.icon}
          <CardTitle className="text-lg font-semibold">{config.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24"><Loader2 className="animate-spin"/></div>
        ) : error ? (
          <p className="text-red-400">Failed to load articles.</p>
        ) : articles && articles.length > 0 ? (
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article.id} className="flex items-center justify-between p-2 rounded-md bg-gray-900/50">
                <span className="text-gray-300 truncate">{article.title}</span>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/edit/articles/${article.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => deleteMutation.mutate(article.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No articles in this section.</p>
        )}
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export default function AdminDashboard() {
  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-900 text-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Content Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage all your articles from one place.</p>
        </div>
        <Link to="/admin/edit/articles/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Article
          </Button>
        </Link>
      </div>
      <div className="space-y-6">
        {(Object.keys(sectionConfig) as Array<keyof typeof sectionConfig>).map((key) => (
          <ArticleListSection key={key} sectionKey={key} />
        ))}
      </div>
    </div>
  );
}

