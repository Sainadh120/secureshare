import React from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 bg-transparent">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="text-white text-2xl font-bold">
              Mirai
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/#about" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">About</Link>
            <Link to="/#contact" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
            {/* Auth links removed — auth handled via dedicated pages */}
          </div>
        </div>
      </nav>
    </header>
  );
}

