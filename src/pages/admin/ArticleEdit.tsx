import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-editor.css';

const articleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  slug: z.string().min(3, 'Slug must be at least 3 characters long.').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  content: z.string().min(10, 'Content is too short.'),
  author_id: z.string().uuid('Please select an author.'),
  category_id: z.string().uuid('Please select a category.'),
  published: z.boolean(),
  is_lead_story: z.boolean(),
  is_featured: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface Author {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminArticleEdit() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: isEdit,
  });

  const { data: authors, isLoading: isLoadingAuthors } = useQuery<Author[], Error>({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('authors').select('id, name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      author_id: '',
      category_id: '',
      published: false,
      is_lead_story: false,
      is_featured: false,
    },
  });

  useEffect(() => {
    if (article) {
      form.reset(article);
    }
  }, [article, form]);

  const mutation = useMutation<void, Error, ArticleFormValues>({
    mutationFn: async (values: ArticleFormValues) => {
      const { error } = isEdit
        ? await supabase.from('articles').update(values).eq('id', id!)
        : await supabase.from('articles').insert(values);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Invalidate all queries related to articles to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['admin-lead-story'] });
      queryClient.invalidateQueries({ queryKey: ['admin-featured-stories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-latest-updates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-trending-articles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] }); // For the main articles list
      
      toast({ title: 'Success', description: `Article ${isEdit ? 'updated' : 'created'} successfully.` });
      navigate('/admin/dashboard'); // Navigate back to the dashboard to see changes
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (values: ArticleFormValues) => {
    mutation.mutate(values);
  };

  if (isLoadingArticle || isLoadingAuthors || isLoadingCategories) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit Article' : 'Create New Article'}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter article title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="unique-article-slug" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
                    <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <ReactQuill
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="author_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an author" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {authors?.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="published"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Published</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_lead_story"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Lead Story</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Featured Story</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Article'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
