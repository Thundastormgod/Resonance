import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login Successful!');
      navigate('/admin/dashboard', { replace: true });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to log in';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center newspaper-texture p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="newspaper-headline text-4xl text-ink-900 ink-bleed">
            Resonance Admin
          </h1>
          <p className="text-ink-600 mt-2 font-serif">
            Sign in to manage your content.
          </p>
        </div>

        <Card className="bg-newsprint-100/80 backdrop-blur-sm border-ink-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-ink-800">
              <LogIn className="h-5 w-5" />
              Secure Login
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ink-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/50 border-ink-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-ink-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/50 border-ink-300"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4">
              <Button type="submit" className="w-full bg-ink-800 hover:bg-ink-900 text-white" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button variant="link" className="text-ink-600 font-normal" asChild>
                <Link to="/">← Back to Website</Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
