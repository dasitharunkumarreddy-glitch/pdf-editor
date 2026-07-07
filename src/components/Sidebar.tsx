import React, { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ThumbnailProps {
  pageIndex: number;
  pdfDoc: any;
  isActive: boolean;
  onClick: () => void;
}

const PageThumbnail: React.FC<ThumbnailProps> = ({ pageIndex, pdfDoc, isActive, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfDoc) return;

    let active = true;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        
        // Target thumbnail width = 110px
        const scale = 110 / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (context && active) {
          // Render only the PDF content, no overlay items
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        console.error(`Error rendering thumbnail for page ${pageIndex + 1}:`, err);
      }
    };

    renderThumbnail();

    return () => {
      active = false;
    };
  }, [pageIndex, pdfDoc]);

  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-xl border-2 cursor-pointer transition-all ${
        isActive
          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
          : 'border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <div className="bg-white shadow-sm border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="max-w-full h-auto" />
      </div>
      <span className="text-xs font-semibold mt-1 text-neutral-500 dark:text-neutral-450">
        Page {pageIndex + 1}
      </span>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const {
    file,
    pdfDoc,
    numPages,
    currentPage,
    setCurrentPage,
    pagesTextItems,
  } = usePdfStore();

  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'pages' | 'search'>('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ pageIndex: number; text: string; id: string }[]>([]);

  // Search filter effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: { pageIndex: number; text: string; id: string }[] = [];

    // Search inside the extracted text items database
    Object.keys(pagesTextItems).forEach((pageStr) => {
      const pageIndex = Number(pageStr);
      const items = pagesTextItems[pageIndex] || [];
      
      items.forEach((item, index) => {
        if (item.text.toLowerCase().includes(query)) {
          results.push({
            pageIndex,
            // Capture snippet
            text: item.text,
            id: `search-${pageIndex}-${index}-${item.text.substring(0,5)}`,
          });
        }
      });
    });

    setSearchResults(results);
  }, [searchQuery, pagesTextItems]);

  if (!file) return null;

  return (
    <div className="relative flex select-none shrink-0 z-20 h-full">
      {/* Sidebar Content Panel */}
      <div
        className={`bg-white dark:bg-neutral-900 border-r border-neutral-250 dark:border-neutral-800 h-full flex flex-col transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'pages'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-neutral-450 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <FileText size={14} />
            <span>Pages</span>
          </button>
          
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${
              activeTab === 'search'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-neutral-450 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Search size={14} />
            <span>Search</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'pages' && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: numPages }).map((_, idx) => (
                <PageThumbnail
                  key={`thumb-${idx}`}
                  pageIndex={idx}
                  pdfDoc={pdfDoc}
                  isActive={currentPage === idx}
                  onClick={() => setCurrentPage(idx)}
                />
              ))}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-250 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-neutral-100"
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {searchResults.length > 0 ? (
                  searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => setCurrentPage(res.pageIndex)}
                      className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-550 dark:hover:bg-neutral-850 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-500">
                          Page {res.pageIndex + 1}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-350 italic truncate">
                        "...{res.text}..."
                      </p>
                    </div>
                  ))
                ) : searchQuery.trim() ? (
                  <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mt-4">
                    No matching text found.
                  </p>
                ) : (
                  <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mt-4">
                    Type a query above to search inside the document text.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse/Expand Handle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-1/2 -translate-y-1/2 -right-3.5 bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 p-1 rounded-full shadow-md cursor-pointer transition-all z-20"
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  );
};
