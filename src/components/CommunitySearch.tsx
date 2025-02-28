import React, { useState } from 'react';
import { getCommunities } from '../api/communities';

interface Props {
  onSearch: (results: any[]) => void;
  onSearchStart: () => void;
  onSearchError: (error: string) => void;
}

export default function CommunitySearch({ onSearch, onSearchStart, onSearchError }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      return;
    }
    
    try {
      setIsSearching(true);
      onSearchStart();
      
      const results = await getCommunities(searchTerm);
      onSearch(results);
    } catch (error: unknown) {
      if (error instanceof Error) {
        onSearchError(error.message);
      } else {
        onSearchError('An unexpected error occurred');
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mb-8 font-mono">
      <div className="bg-black text-white px-4 py-2 mb-4 inline-block transform -rotate-0.5 shadow-sm">
        <span className="text-teal-400">F</span>
        <span>I</span>
        <span className="text-pink-400">N</span>
        <span>D</span>
        <span> </span>
        <span className="text-purple-400">C</span>
        <span>O</span>
        <span className="text-teal-400">M</span>
        <span>M</span>
        <span className="text-pink-400">U</span>
        <span>N</span>
        <span className="text-purple-400">I</span>
        <span>T</span>
        <span className="text-teal-400">I</span>
        <span>E</span>
        <span className="text-pink-400">S</span>
      </div>
      
      <form onSubmit={handleSearch} className="flex items-center">
        <input
          type="text"
          placeholder="Search communities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-3 mr-4 bg-white border-0 shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-400"
          disabled={isSearching}
        />
        <button 
          type="submit" 
          className="px-6 py-3 bg-black text-white uppercase tracking-wider hover:bg-gray-900 disabled:bg-gray-600 shadow-md relative overflow-hidden group"
          disabled={isSearching || !searchTerm.trim()}
        >
          <span className="relative z-10">{isSearching ? 'Searching...' : 'Search'}</span>
          <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
        </button>
      </form>
    </div>
  );
}
