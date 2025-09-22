import { useState, useEffect } from 'react';

const toastStyles = {
  success: {
    icon: (
      <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
      </svg>
    ),
    color: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: (
      <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z"/>
      </svg>
    ),
    color: 'text-red-500 dark:text-red-400',
  },
  info: {
    icon: (
      <svg className="w-5 h-5 rotate-45" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 20">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 17 8 2L9 1 1 19l8-2Zm0 0V9"/>
      </svg>
    ),
    color: 'text-blue-600 dark:text-blue-500',
  },
};

const Toast = ({ message, type, onDone }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade-out animation before calling onDone
        setTimeout(onDone, 500);
      }, 3000); // Toast visible for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [message, onDone]);

  // Default to 'info' style if the type is not 'success' or 'error'
  const style = toastStyles[type] || toastStyles.info;

  const baseClasses =
    'fixed top-5 right-5 flex items-center w-full max-w-xs p-4 space-x-4 rtl:space-x-reverse text-gray-500 bg-white divide-x rtl:divide-x-reverse divide-gray-200 rounded-lg shadow-lg dark:text-gray-400 dark:divide-gray-700 dark:bg-gray-800 transition-all duration-500 ease-in-out';
  const visibilityClasses = visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full';

  if (!message) return null;

  return (
    <div className={`${baseClasses} ${visibilityClasses}`} role="alert">
      <span className={style.color}>
        {style.icon}
      </span>
      <div className="ps-4 text-sm font-normal">{message}</div>
    </div>
  );
};

export default Toast;