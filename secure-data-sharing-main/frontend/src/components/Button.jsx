import React from 'react';

function Button({ children, onClick, className = "", size = "lg" }) {
  const sizeClasses = {
    lg: "px-8 py-4 text-lg rounded-xl",
    md: "px-6 py-3 text-base rounded-lg",
  };

  const baseClasses = "font-semibold text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-105";
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;