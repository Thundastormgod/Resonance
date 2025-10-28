import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

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

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
        <Router>
          <PWAInstallPrompt />
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/article/:slug" element={<Article />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Category Routes - Dynamic route that matches all category slugs */}
                <Route path="/:category" element={<Category />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                {/* Admin Routes: All routes under /admin are protected and use AdminLayout */}
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
                </Route>

                {/* Not Found Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster />
          </div>
        </Router>
      </ThemeProvider>
  );
}

export default App;
