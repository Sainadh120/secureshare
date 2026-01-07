import React from 'react';
import { Link } from "react-router-dom";

const scrollToSection = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

export default function Navbar({ user, onLogout, setAuthOpen }) {
  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo with unique style */}
          <div className="flex-shrink-0">
            <a href="#" className="text-2xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Mirai
            </a>
          </div>

          {/* New Center Links for project information */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} className="text-gray-400 hover:text-white transition-colors">
              Platform
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Solutions
            </a>
             <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Developers
            </a>
          </div>

          {/* Right-side Buttons with About and Contact now included */}
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-6">
              <a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }} className="text-gray-400 hover:text-white transition-colors text-sm">
                About
              </a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }} className="text-gray-400 hover:text-white transition-colors text-sm">
                Contact
              </a>
            </div>

            <div className="w-px h-6 bg-gray-700 hidden md:block"></div>

            <div className="flex items-center space-x-4">
              {/* Auth buttons removed — use new auth pages */}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

