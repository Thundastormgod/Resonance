import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AuthProvider from './contexts/AuthContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
