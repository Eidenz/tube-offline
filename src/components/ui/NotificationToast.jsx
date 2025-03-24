import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotification();

  // Variants for notification animation
  const notificationVariants = {
    initial: { x: 120, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 120, opacity: 0 }
  };

  // Get the appropriate icon based on notification type
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  // Get background color based on notification type
  const getBackground = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-800/20 border-green-500/30';
      case 'error':
        return 'bg-red-800/20 border-red-500/30';
      case 'warning':
        return 'bg-yellow-800/20 border-yellow-500/30';
      case 'info':
      default:
        return 'bg-blue-800/20 border-blue-500/30';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg backdrop-blur-sm border ${getBackground(notification.type)}`}
            variants={notificationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            layout
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {notification.message}
                </p>
              </div>
              
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;