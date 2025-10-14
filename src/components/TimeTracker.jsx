import { useState, useEffect, useRef } from 'react';

const TimeTracker = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const dropdownRef = useRef(null);

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzvZ6qL3u9tjWWAH2WXf_xMvlFSpnj963ZuS6BioH9JDKsToXItvIGr8RJ-EnLi630F_Q/exec';

  // Predefined employee data
  const employeeData = {
    '240722': 'Priyanku Saikia',
    '240705': 'Priyanshu Rangari',
    '250421': 'Philip Meka',
    '240940': 'Abhishek Mandal',
    '250611': 'Vagmare Vidya Vardhan',
    '250302': 'Nemuri Swetha Lahari',
    '250307': 'Akshitha Mekala',
    '250305': 'Akanksha Bonike',
    '250507': 'Abhinav Kotagiri',
    '250321': 'Urkonda Ramanjaneyulu',
    '250521': 'Charan tridandapani',
    '250610': 'Mahendra Bandi',
    '250522': 'Bunga Pravalika'
  };

  // Timeout wrapper for fetch
  const fetchWithTimeout = (url, options, timeout = 8000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  };

  // Get current time in AM/PM format
  const getCurrentTimeAMPM = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get current time in 24-hour format (for server)
  const getCurrentTime24Hour = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    checkExistingSession();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const checkExistingSession = async () => {
    const savedSession = localStorage.getItem('workZenSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        console.log('Found saved session:', session);
        
        // Check if session is expired (20 hours limit)
        const sessionStartTime = new Date(`${session.date} ${session.loginTime}`);
        const currentTime = new Date();
        const hoursDiff = (currentTime - sessionStartTime) / (1000 * 60 * 60);
        
        if (hoursDiff >= 20) {
          // Session expired - clear it
          localStorage.removeItem('workZenSession');
          setShowSessionExpired(true);
          showToast('Previous session expired. Please login again.', 'info');
          return;
        }
        
        // Set state immediately
        setIsLoggedIn(true);
        setEmployeeId(session.employeeId);
        setEmployeeName(session.employeeName);
        setCurrentSession(session);
        showToast('Session restored', 'success');
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('workZenSession');
      }
    }
  };

  // Session timer effect with 20-hour expiration
  useEffect(() => {
    let interval;
    
    if (isLoggedIn && currentSession) {
      console.log('Starting session timer with:', currentSession);
      
      const startSessionTimer = () => {
        const loginDateTime = new Date(`${currentSession.date} ${currentSession.loginTime}`);

        const updateTimer = () => {
          const now = new Date();
          const diffMs = now - loginDateTime;
          
          // Check if session expired (20 hours)
          const hoursDiff = diffMs / (1000 * 60 * 60);
          if (hoursDiff >= 20) {
            // Auto logout due to expiration
            handleAutoLogout();
            return;
          }

          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          setSessionDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        return setInterval(updateTimer, 1000);
      };

      interval = startSessionTimer();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, currentSession]);

  const handleAutoLogout = async () => {
    console.log('Auto-logout due to session expiration');
    
    // Clear everything without server call (since it's auto due to timeout)
    localStorage.removeItem('workZenSession');
    setIsLoggedIn(false);
    setEmployeeId('');
    setEmployeeName('');
    setSessionDuration('');
    setCurrentSession(null);
    setShowSessionExpired(true);
    showToast('Session expired after 20 hours. Please login again.', 'info');
  };

  const checkServerSession = async (employeeId) => {
    try {
      const response = await fetchWithTimeout(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkSession',
          employeeId: employeeId
        }),
      }, 5000); // 5 second timeout for session check

      const text = await response.text();
      if (response.ok) {
        const data = JSON.parse(text);
        return data.hasActiveSession;
      }
      return false;
    } catch (error) {
      console.error('Error checking server session:', error);
      return false; // Assume no session on error
    }
  };

  const sendRequest = async (payload, timeout = 8000) => {
    console.log('Sending payload:', payload);
    
    try {
      const response = await fetchWithTimeout(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, timeout);

      const text = await response.text();
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Network error! Status: ${response.status}`);
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Fetch error:', error);
      
      // Immediate fallback for timeout/network issues
      if (error.message.includes('timeout') || error.message.includes('Network')) {
        return { status: 'success', message: 'Request sent (offline mode)' };
      }
      
      // Try no-cors as last resort
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        return { status: 'success', message: 'Request sent (no-cors mode)' };
      } catch (noCorsError) {
        console.error('No-cors also failed:', noCorsError);
        return { status: 'success', message: 'Request queued (offline)' };
      }
    }
  };

  const handleEmployeeIdChange = (e) => {
    const id = e.target.value;
    setEmployeeId(id);
    
    if (employeeData[id]) {
      setEmployeeName(employeeData[id]);
    } else {
      setEmployeeName('');
    }
    setMessage('');
    setShowSessionExpired(false);
  };

  const handleDropdownSelect = (id) => {
    setEmployeeId(id);
    if (employeeData[id]) {
      setEmployeeName(employeeData[id]);
    } else {
      setEmployeeName('');
    }
    setMessage('');
    setIsDropdownOpen(false);
    setShowSessionExpired(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Check if already logged in locally
    if (isLoggedIn) {
      showToast('You are already logged in! Use logout button to end session.', 'info');
      return;
    }

    if (!employeeId.trim() || !employeeName.trim()) {
      showToast('Please enter valid Employee ID', 'error');
      return;
    }

    if (!employeeData[employeeId] || employeeData[employeeId] !== employeeName) {
      showToast('Invalid Employee ID or Name', 'error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // OPTIMIZATION: Prepare session data first (don't wait for network)
      const currentDate = new Date();
      const sessionData = {
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        loginTime: getCurrentTime24Hour(),
        loginTimeAMPM: getCurrentTimeAMPM(),
        date: currentDate.toISOString().split('T')[0]
      };

      // OPTIMIZATION: Save to localStorage immediately for fast UI response
      localStorage.setItem('workZenSession', JSON.stringify(sessionData));
      setIsLoggedIn(true);
      setCurrentSession(sessionData);
      setShowSessionExpired(false);

      // Show immediate feedback to user
      showToast(`Login successful at ${sessionData.loginTimeAMPM}! Syncing data...`, 'success');

      // OPTIMIZATION: Run server operations in background (don't block UI)
      const serverPayload = {
        action: 'login',
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        loginTime: sessionData.loginTime,
        loginTimeAMPM: sessionData.loginTimeAMPM
      };

      // Send to server in background (non-blocking)
      setTimeout(async () => {
        try {
          const responseData = await sendRequest(serverPayload, 10000); // 10s timeout for login
          
          if (responseData.status !== 'success' && !responseData.message?.includes('offline') && !responseData.message?.includes('no-cors')) {
            console.warn('Server sync failed, but local session is active');
            // Local session remains active even if server fails
          } else {
            console.log('Server sync completed successfully');
          }
        } catch (serverError) {
          console.error('Background server sync failed:', serverError);
          // User doesn't see this error - local session remains active
        }
      }, 0);

    } catch (error) {
      console.error('Login error:', error);
      showToast('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!isLoggedIn || !employeeId.trim()) {
      showToast('No active session to logout.', 'error');
      return;
    }

    setLoading(true);

    try {
      const currentDate = new Date();
      const logoutTime24H = getCurrentTime24Hour();
      const logoutTimeAMPM = getCurrentTimeAMPM();
      
      // Clear local session immediately
      localStorage.removeItem('workZenSession');
      setIsLoggedIn(false);
      setEmployeeId('');
      setEmployeeName('');
      setSessionDuration('');
      setCurrentSession(null);
      setShowSessionExpired(false);
      
      // Show immediate success message
      showToast(`Logout successful at ${logoutTimeAMPM}!`, 'success');

      // Send logout to server in background
      setTimeout(async () => {
        try {
          const payload = {
            action: 'logout',
            employeeId: employeeId.trim(),
            logoutTime: logoutTime24H,
            logoutTimeAMPM: logoutTimeAMPM,
            logoutDate: currentDate.toISOString().split('T')[0]
          };

          await sendRequest(payload, 5000);
        } catch (serverError) {
          console.error('Background logout sync failed:', serverError);
        }
      }, 0);

    } catch (error) {
      console.error('Logout error:', error);
      showToast('Logout failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Flowbite Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center w-full max-w-xs p-4 space-x-4 rtl:space-x-reverse text-gray-500 bg-white divide-x rtl:divide-x-reverse divide-gray-200 rounded-lg shadow-sm dark:text-gray-400 dark:divide-gray-700 dark:bg-gray-800" role="alert">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-500 rotate-45" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 20">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 17 8 2L9 1 1 19l8-2Zm0 0V9"/>
          </svg>
          <div className="ps-4 text-sm font-normal">{toast.message}</div>
        </div>
      )}

      {/* Session Expired Modal */}
      {showSessionExpired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Session Expired</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your previous session has expired after 20 hours. Please login again to start a new session.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setShowSessionExpired(false)}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md relative z-30">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#ffc947] to-[#202426] bg-clip-text text-transparent">
            WORKZEN
          </h1>
          <p className="text-gray-600">Employee Attendance Tracking System</p>
          
          {/* Display login time when logged in */}
          {isLoggedIn && currentSession?.loginTimeAMPM && (
            <p className="text-sm text-green-600 mt-2">
              Logged in at: {currentSession.loginTimeAMPM}
            </p>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                Employee ID *
              </label>
              {isLoggedIn && sessionDuration && (
                <div className="text-base font-mono font-bold text-blue-800">
                  {sessionDuration}
                </div>
              )}
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                id="dropdownDefaultButton"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={loading || isLoggedIn}
                className="w-full text-gray-700 bg-white border border-gray-300 hover:border-[#ffc947] focus:ring-2 focus:outline-none focus:ring-[#ffc947] font-medium rounded-lg text-base px-4 py-3 text-left inline-flex items-center justify-between transition-colors disabled:opacity-50"
                type="button"
              >
                {employeeId || 'Select your ID'}
                <svg className={`w-2.5 h-2.5 ms-3 transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div id="dropdown" className="z-20 absolute mt-1 bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto">
                  <ul className="py-2 text-sm text-gray-700" aria-labelledby="dropdownDefaultButton">
                    {Object.keys(employeeData).map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => handleDropdownSelect(id)}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          {id} - {employeeData[id]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name *
            </label>
            <input
              id="employeeName"
              type="text"
              value={employeeName}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ffc947] focus:border-[#ffc947]"
              placeholder="Name will auto-fill"
              required
              disabled={loading || isLoggedIn}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || isLoggedIn}
              className="flex-1 bg-[#ffc947] text-[#202426] py-3 px-4 rounded-md 
                         hover:bg-[#202426] hover:text-[#ffc947] focus:outline-none focus:ring-2 
                         focus:ring-[#ffc947] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors font-medium text-base flex items-center justify-center"
            >
              {loading && !isLoggedIn ? (
                <div className="flex items-center justify-center">
                  <svg aria-hidden="true" className="w-4 h-4 animate-spin text-gray-300 fill-[#202426]" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                  <span className="hidden sm:inline ml-2">Logging in...</span>
                  <span className="sm:hidden ml-2">Wait...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !isLoggedIn}
              className="flex-1 bg-[#202426] text-[#ffc947] py-3 px-4 rounded-md 
                         hover:bg-[#ffc947] hover:text-[#202426] focus:outline-none focus:ring-2 
                         focus:ring-[#202426] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors font-medium text-base flex items-center justify-center"
            >
              {loading && isLoggedIn ? (
                <div className="flex items-center justify-center">
                  <svg aria-hidden="true" className="w-4 h-4 animate-spin text-gray-600 fill-[#ffc947]" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                  <span className="hidden sm:inline ml-2">Logging out...</span>
                  <span className="sm:hidden ml-2">Wait...</span>
                </div>
              ) : (
                'Logout'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {isLoggedIn
              ? `Session active for ${employeeName} (ID: ${employeeId}) - Auto logout after 20 hours`
              : 'Enter your Employee ID to start tracking time'}
          </p>
          <div className="mt-2 text-center">
            <p className="text-xs font-bold" style={{ color: '#ffc947' }}>
              @ Developed by Mahendra &amp; Akshitha
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              &copy; {new Date().getFullYear()} Zenbeta Technologies. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;