import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Supabase removed - using Sanity as backend
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface Article {
  id: string;
  title: string;
  published: boolean;
  created_at: string;
  authors: { name: string }[] | null;
  categories: { name: string }[] | null;
}

async function fetchArticles(): Promise<Article[]> {
  // TODO: Replace with Sanity query when needed
  // Disabled Supabase - using Sanity as backend
  return [] as Article[];
}

export default function AdminArticles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: articles, isLoading } = useQuery<Article[], Error>({
    queryKey: ['admin-articles'],
    queryFn: fetchArticles,
  });

  const deleteMutation = useMutation<void, Error, string>({ 
    mutationFn: async (articleId: string) => {
      // TODO: Replace with Sanity delete when needed
      throw new Error('Delete functionality disabled - using Sanity as backend');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Success', description: 'Article deleted successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleDelete = (articleId: string) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      deleteMutation.mutate(articleId);
    }
  };

  if (isLoading) {
    return <div>Loading articles...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Articles</h1>
        <Button asChild>
          <Link to="/admin/articles/new">New Article</Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles?.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                                                                <TableCell>{article.authors?.[0]?.name ?? 'N/A'}</TableCell>
                <TableCell>{article.categories?.[0]?.name ?? 'N/A'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${article.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {article.published ? 'Published' : 'Draft'}
                  </span>
                </TableCell>
                <TableCell>{new Date(article.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/articles/${article.id}`}>Edit</Link>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(article.id)} disabled={deleteMutation.isPending}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
