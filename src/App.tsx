import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';

import { Toaster } from '@/components/ui/toaster';

import Index from '@/pages/Index';
import Article from '@/pages/Article';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import NotFound from '@/pages/NotFound';

import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminArticles from './pages/admin/Articles';
import AdminArticleEdit from './pages/admin/ArticleEdit';
import ContentSection from './pages/admin/ContentSection';
import AdminLogin from '@/pages/admin/Login';
import ProtectedRoute from '@/components/admin/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/article/:slug" element={<Article />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

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
            <Toaster />
          </div>
        </Router>
      </ThemeProvider>
  );
}

export default App;
