import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 w-full max-w-[100vw] overflow-x-hidden">
      <header className="bg-white shadow w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden p-1"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Resonance Admin</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs sm:text-sm">
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 w-full">
        <div className="flex flex-col lg:flex-row">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar navigation */}
          <nav className={`
            fixed lg:relative top-0 left-0 h-full lg:h-auto z-50 lg:z-auto
            w-64 bg-white lg:bg-transparent shadow-lg lg:shadow-none
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            lg:w-48 xl:w-64 lg:pr-4 xl:pr-6 lg:flex-shrink-0
          `}>
            <div className="p-4 lg:p-0 space-y-1">
              <div className="lg:hidden flex justify-between items-center mb-4 pb-4 border-b">
                <span className="font-semibold">Menu</span>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NavLink to="/admin" onClick={() => setSidebarOpen(false)}>Dashboard</NavLink>
              <NavLink to="/admin/articles" onClick={() => setSidebarOpen(false)}>Articles</NavLink>
              <NavLink to="/admin/ai-generator" onClick={() => setSidebarOpen(false)}>AI Generator</NavLink>
            </div>
          </nav>
          
          <main className="flex-1 min-w-0 w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function NavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
    >
      {children}
    </Link>
  );
}
