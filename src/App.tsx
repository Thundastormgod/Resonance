import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { SplashScreen } from '@/components/SplashScreen';
import { NewspaperFlipTransition, FadeScaleTransition } from '@/components/PageTransitions';

import { Toaster } from '@/components/ui/toaster';

// Public routes - loaded immediately
import Index from '@/pages/Index';
import Article from '@/pages/Article';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import NotFound from '@/pages/NotFound';
import Category from '@/pages/Category';

// Admin routes - lazy loaded (code splitting)
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminArticles = lazy(() => import('./pages/admin/Articles'));
const AdminArticleEdit = lazy(() => import('./pages/admin/ArticleEdit'));
const ContentSection = lazy(() => import('./pages/admin/ContentSection'));
const AdminLogin = lazy(() => import('@/pages/admin/Login'));
const ProtectedRoute = lazy(() => import('@/components/admin/ProtectedRoute'));
const SanityStudioPage = lazy(() => import('./pages/admin/Studio'));

// AI News Generator - lazy loaded
const AINewsGenerator = lazy(() => import('@/features/ai-news-generator/components/AINewsGenerator'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Animated routes wrapper with smart transition selection
const AnimatedRoutes = () => {
  const location = useLocation();
  
  // Determine transition type based on route
  const isArticle = location.pathname.includes('/article/');
  const isAdmin = location.pathname.startsWith('/admin');
  const isStudio = location.pathname.startsWith('/studio');
  
  // Sanity Studio route (full screen, no layout)
  if (isStudio) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/studio" element={<SanityStudioPage />} />
          <Route path="/studio/*" element={<SanityStudioPage />} />
        </Routes>
      </Suspense>
    );
  }
  
  // No animation for admin routes
  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="articles" element={<AdminArticles />} />
            <Route path="edit/articles/new" element={<AdminArticleEdit />} />
            <Route path="edit/articles/:id" element={<AdminArticleEdit />} />
            <Route path="content/:sectionType" element={<ContentSection />} />
            {/* AI Generator - admin already verified by parent ProtectedRoute */}
            <Route path="ai-generator" element={<AINewsGenerator />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }
  
  // Use newspaper flip for articles, fade scale for everything else
  const TransitionComponent = isArticle ? NewspaperFlipTransition : FadeScaleTransition;
  
  return (
    <TransitionComponent>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Category Routes - Dynamic route that matches all category slugs */}
          <Route path="/:category" element={<Category />} />

          {/* Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </TransitionComponent>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    // Check if this is the first load in this session
    const hasLoadedBefore = sessionStorage.getItem('app-loaded');
    
    if (hasLoadedBefore) {
      // Skip splash screen on subsequent navigations within same session
      setShowSplash(false);
      setIsFirstLoad(false);
    } else {
      // Mark as loaded for this session
      sessionStorage.setItem('app-loaded', 'true');
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <ThemeProvider>
      {isFirstLoad && showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && (
        <Router>
          <PWAInstallPrompt />
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <AnimatedRoutes />
            <Toaster />
          </div>
        </Router>
      )}
    </ThemeProvider>
  );
}

export default App;
