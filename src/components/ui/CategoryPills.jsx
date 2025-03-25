import { useRef, useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const CategoryPills = ({ categories, activeCategory, onChange }) => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const containerRef = useRef(null);
  
  // Check if we need to show scroll arrows
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const checkForArrows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10); // 10px buffer
    };
    
    checkForArrows();
    container.addEventListener('scroll', checkForArrows);
    window.addEventListener('resize', checkForArrows);
    
    return () => {
      container.removeEventListener('scroll', checkForArrows);
      window.addEventListener('resize', checkForArrows);
    };
  }, [categories]);
  
  // Scroll functions
  const scrollLeft = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };
  
  const scrollRight = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };
  
  return (
    <div className="relative">
      {/* Left scroll button - now only shown on larger screens */}
      {showLeftArrow && (
        <div className="hidden md:block">
          <button 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-secondary/90 rounded-full p-1 shadow-md"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Container - now with flex-wrap for small screens */}
      <div 
        ref={containerRef}
        className="flex flex-wrap overflow-y-auto max-w-full gap-3 py-2 pb-3 md:overflow-x-auto md:overflow-y-hidden md:no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category, index) => (
          <motion.button
            key={index}
            className={`category-pill ${category.value === activeCategory ? 'active' : ''}`}
            onClick={() => onChange(category.value)}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {category.label}
          </motion.button>
        ))}
      </div>
      
      {/* Right scroll button - now only shown on larger screens */}
      {showRightArrow && (
        <div className="hidden md:block">
          <button 
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-secondary/90 rounded-full p-1 shadow-md"
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryPills;