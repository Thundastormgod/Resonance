import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * Sanity Studio Page
 * 
 * Redirects authenticated admin users to the embedded Sanity Studio
 * The studio is deployed at a subdomain and loaded in an iframe for security
 */
export default function SanityStudioPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-slate-400">Loading Sanity Studio...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  // Sanity Studio URL - deployed on Netlify
  const studioUrl = 'https://aesthetic-strudel-6cebd7.netlify.app';

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Admin
          </button>
          <span className="text-white font-medium">Sanity Studio</span>
        </div>
        <a
          href={studioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>
      
      {/* Studio iframe */}
      <iframe
        src={studioUrl}
        className="w-full"
        style={{ height: 'calc(100vh - 56px)', border: 'none' }}
        title="Sanity Studio"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
