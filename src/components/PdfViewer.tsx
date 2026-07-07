import React, { useEffect, useRef } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { PageContainer } from './PageContainer';

export const PdfViewer: React.FC = () => {
  const { pdfDoc, numPages, currentPage, setCurrentPage } = usePdfStore();
  const viewerRef = useRef<HTMLDivElement>(null);
  
  // Track who triggered the page change (user scroll vs. sidebar click)
  const isScrollingToPageRef = useRef<boolean>(false);

  // 1. Observe scrolled page to update sidebar highlighted item
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pdfDoc || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Skip updating active index if we are in the middle of smooth scrolling to a page
        if (isScrollingToPageRef.current) return;

        // Find the page with the highest intersection ratio
        let bestEntry = entries[0];
        for (const entry of entries) {
          if (entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }

        if (bestEntry && bestEntry.isIntersecting) {
          const index = Number(bestEntry.target.getAttribute('data-page-index'));
          if (!isNaN(index) && index !== currentPage) {
            setCurrentPage(index);
          }
        }
      },
      {
        root: viewer,
        threshold: 0.35, // Trigger when 35% of the page container is in focus
      }
    );

    const pageContainers = viewer.querySelectorAll('[data-page-index]');
    pageContainers.forEach((container) => observer.observe(container));

    return () => {
      observer.disconnect();
    };
  }, [numPages, pdfDoc, currentPage]);

  // 2. Scroll page container into view on sidebar thumbnail click
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    const targetElement = document.getElementById(`page-container-${currentPage}`);
    const viewer = viewerRef.current;
    if (!targetElement || !viewer) return;

    // Check if the page is already mostly visible inside the viewport to avoid jumpy scrolls
    const viewerRect = viewer.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const isVisible =
      targetRect.top >= viewerRect.top - 100 &&
      targetRect.bottom <= viewerRect.bottom + 100;

    if (!isVisible) {
      isScrollingToPageRef.current = true;
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      // Unlock scroll listener after smooth scroll finishes
      const handleScrollEnd = () => {
        isScrollingToPageRef.current = false;
        viewer.removeEventListener('scrollend', handleScrollEnd);
      };

      // Firefox and modern Chrome/Safari support scrollend. Fallback using timeout:
      viewer.addEventListener('scrollend', handleScrollEnd);
      const fallback = setTimeout(() => {
        isScrollingToPageRef.current = false;
        viewer.removeEventListener('scrollend', handleScrollEnd);
      }, 600);

      return () => {
        clearTimeout(fallback);
        viewer.removeEventListener('scrollend', handleScrollEnd);
      };
    }
  }, [currentPage, pdfDoc]);

  return (
    <div
      ref={viewerRef}
      className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950 p-6 flex flex-col items-center custom-scrollbar h-full transition-colors"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="max-w-full flex flex-col items-center">
        {Array.from({ length: numPages }).map((_, idx) => (
          <div
            key={`page-wrap-${idx}`}
            id={`page-container-${idx}`}
            data-page-index={idx}
            className="w-full flex justify-center"
          >
            <PageContainer pageIndex={idx} />
          </div>
        ))}
      </div>
    </div>
  );
};
