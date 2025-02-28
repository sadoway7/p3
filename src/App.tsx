import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-[1800px] mx-auto px-4 py-0">
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
}
