import React, { useState } from 'react';
import Link from 'next/link';

export function AppBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-3 shadow-md flex justify-between items-center z-50 relative">
      <div className="flex items-center space-x-3">
        <span className="text-xl">📱</span>
        <div>
          <p className="font-bold text-sm">Download the new Adhyayan Mobile App!</p>
          <p className="text-xs opacity-90">Experience AI-powered learning on the go.</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Link href="/download">
          <span className="bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
            Download Now
          </span>
        </Link>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
