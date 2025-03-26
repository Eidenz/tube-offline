import { useState } from 'react';
import { 
  InformationCircleIcon, 
  LockClosedIcon, 
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

/**
 * Component for uploading cookies to handle age-restricted videos
 * @param {Object} props Component props
 * @param {File} props.cookiesFile Current cookies file
 * @param {Function} props.onCookiesChange Callback when cookies file changes
 * @param {boolean} props.isAgeRestricted Whether the current video is age-restricted
 * @returns {JSX.Element} Cookie upload component
 */
const CookieUpload = ({ cookiesFile, onCookiesChange, isAgeRestricted }) => {
  const [infoOpen, setInfoOpen] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onCookiesChange(e.target.files[0]);
    }
  };

  const clearFile = () => {
    onCookiesChange(null);
  };

  if (!isAgeRestricted) return null;

  return (
    <motion.div 
      className="mb-4 rounded-lg border border-yellow-600/30 bg-yellow-900/20 p-4"
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <LockClosedIcon className="h-5 w-5 text-yellow-500" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-yellow-500">Age-restricted video detected</h3>
            <button 
              onClick={() => setInfoOpen(!infoOpen)}
              className="text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>
          
          {infoOpen && (
            <motion.div 
              className="mt-2 text-xs text-yellow-400 bg-yellow-950/50 p-3 rounded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p>
                To download age-restricted videos, you need to provide YouTube cookies from a browser where you're signed in and have confirmed your age.
              </p>
              <p className="mt-2">
                You can export cookies using browser extensions like "EditThisCookie" or "Cookie-Editor". 
                Export them as a Netscape/Mozilla cookie file (.txt).
              </p>
              <p className="mt-2">
                <strong>Important:</strong> Your cookies are only used temporarily for this download and are not stored.
              </p>
            </motion.div>
          )}
          
          <div className="mt-3">
            {cookiesFile ? (
              <div className="flex items-center justify-between rounded bg-yellow-950/50 px-3 py-2">
                <span className="text-sm text-yellow-300">{cookiesFile.name}</span>
                <button 
                  className="text-yellow-500 hover:text-yellow-300"
                  onClick={clearFile}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-yellow-600/50 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-950/50 transition-colors">
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span>Upload YouTube cookies file</span>
                <input 
                  type="file" 
                  accept=".txt" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CookieUpload;