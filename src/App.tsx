import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Copy, Eye, PlayCircle, Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface Script {
  id: string;
  title: string;
  script: string;
  image?: string;
  game?: { name: string };
  views?: number;
  verified?: boolean;
}

interface ApiResponse {
  result: {
    scripts: Script[];
    totalPages?: number;
  };
}

const App: React.FC = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<IntersectionObserver>();
  const lastCardRef = useRef<HTMLDivElement>(null);

  const fetchScripts = async (url: string): Promise<ApiResponse> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const loadScripts = useCallback(async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    const currentPage = reset ? 1 : page;
    
    try {
      const apiUrl = searchTerm 
        ? `/api/script/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}`
        : `/api/script/fetch?page=${currentPage}`;

      console.log('Fetching:', apiUrl);
      const data = await fetchScripts(apiUrl);
      const newScripts = data.result.scripts || [];
      
      if (reset) {
        setScripts(newScripts);
        setPage(2);
      } else {
        setScripts(prev => [...prev, ...newScripts]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(newScripts.length > 0);
      
      if (newScripts.length === 0 && !reset) {
        showNotification('No more scripts to load!', 'error');
      }
    } catch (error) {
      showNotification(`Failed to load scripts: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
      if (initialLoading) setInitialLoading(false);
    }
  }, [loading, page, searchTerm, initialLoading]);

  const handleSearch = useCallback(() => {
    setScripts([]);
    setPage(1);
    setHasMore(true);
    loadScripts(true);
  }, [loadScripts]);

  const handleSearchInput = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setScripts([]);
      setPage(1);
      setHasMore(true);
      loadScripts(true);
    }, 500);
  }, [loadScripts]);

  const handleCopy = async (script: string, title: string) => {
    if (!script) {
      showNotification('No script content found', 'error');
      return;
    }

    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(script);
        showNotification(`${title} copied to clipboard!`, 'success');
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = script;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`${title} copied to clipboard!`, 'success');
      }
    } catch (err) {
      showNotification('Failed to copy script', 'error');
    }
  };

  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getImageUrl = (script: Script): string => {
    if (!script.image) return 'https://images.pexels.com/photos/1337386/pexels-photo-1337386.jpeg?auto=compress&cs=tinysrgb&w=400';
    return script.image.startsWith('http') 
      ? script.image 
      : `https://scriptblox.com${script.image}`;
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading && !initialLoading) {
        loadScripts();
      }
    });

    if (lastCardRef.current) {
      observerRef.current.observe(lastCardRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadScripts, hasMore, loading, initialLoading]);

  // Initial load
  useEffect(() => {
    loadScripts(true);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-gray-300 mt-4 text-lg font-medium">Loading Script Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-primary text-gray-300 relative overflow-x-hidden">
      <div className="relative z-10 p-5 max-w-7xl mx-auto">
{/* Header */}
<div className="mb-8">
  {/* Search Bar */}
  <div className="flex gap-3 max-w-full">
    <input
      type="text"
      placeholder="Search scripts..."
      value={searchTerm}
      onChange={(e) => handleSearchInput(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      className="flex-1 bg-black text-gray-300 placeholder-gray-500 px-4 py-3 border border-gray-600 rounded-md focus:outline-none focus:border-gray-500 transition-colors duration-300"
    />
    <button
      onClick={handleSearch}
      className="px-6 py-3 bg-black text-gray-300 border border-gray-600 rounded-md hover:bg-gray-600 transition-colors duration-300 flex items-center gap-2"
    >
      <Search className="w-4 h-4" />
      Search
    </button>
  </div>
</div>


        {/* Scripts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mb-8">
          {scripts.map((script, index) => (
            <div
              key={`${script.id}-${index}`}
              ref={index === scripts.length - 1 ? lastCardRef : undefined}
              className="bg-dark-secondary border border-gray-600 rounded-lg overflow-hidden hover:bg-gray-700 hover:border-gray-500 transform hover:scale-105 transition-all duration-300 animate-fade-in-up flex flex-col h-80"
              style={{ animationDelay: `${(index % 12) * 50}ms` }}
            >
              {/* Image */}
              <div className="relative h-32 overflow-hidden bg-black">
                <img
                  src={getImageUrl(script)}
                  alt={script.title}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/1337386/pexels-photo-1337386.jpeg?auto=compress&cs=tinysrgb&w=400';
                  }}
                />
                
                {/* Verified Badge */}
                {script.verified && (
                  <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3 flex flex-col flex-grow">
                <h3 className="text-gray-200 font-semibold text-sm mb-2 line-clamp-2 hover:text-gray-100 transition-colors duration-300">
                  {script.title}
                </h3>
                
                <div className="text-gray-400 text-xs mb-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" />
                    <span>{script.game?.name || 'No game specified'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Views: {script.views?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleCopy(script.script, script.title)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 rounded-md font-medium transition-all duration-300 flex items-center justify-center gap-2 mt-auto text-sm"
                >
                  <Copy className="w-3 h-3" />
                  Copy Script
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && !initialLoading && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin"></div>
          </div>
        )}

        {/* No More Scripts Message */}
        {!hasMore && scripts.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-400 bg-dark-secondary px-6 py-3 rounded-full border border-gray-600">
              <AlertCircle className="w-4 h-4" />
              You've reached the end!
            </div>
          </div>
        )}

        {/* Empty State */}
        {scripts.length === 0 && !loading && !initialLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3 text-gray-400 mb-4">
              <Search className="w-8 h-8" />
              <span className="text-xl font-medium">No scripts found</span>
            </div>
            <p className="text-gray-500">Try adjusting your search terms or browse all scripts</p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleSearch();
                }}
                className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors duration-300"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div 
          className={`fixed bottom-20 right-5 z-50 p-4 rounded-lg animate-slide-in-right ${
            notification.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.text}</span>
          </div>
        </div>
      )}

      {/* Page Indicator */}
      <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-dark-secondary text-gray-300 px-5 py-2 rounded-full border border-gray-600 text-sm font-medium">
          Page {page - 1} • {scripts.length} scripts loaded
        </div>
      </div>
    </div>
  );
};

export default App;