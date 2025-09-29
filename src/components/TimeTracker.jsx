import { useState, useEffect } from 'react';

const TimeTracker = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzvZ6qL3u9tjWWAH2WXf_xMvlFSpnj963ZuS6BioH9JDKsToXItvIGr8RJ-EnLi630F_Q/exec';

  // Predefined employee data
  const employeeData = {
    '240722': 'Priyanku Saikia',
    '240705': 'Priyanshu Rangari',
    '250421': 'Philip Meka',
    '240940': 'Mandal Abhishek',
    '250611': 'Vagmare Vidya Vardhan',
    '250302': 'Nemuri Swetha Lahari',
    '250307': 'Mekala Akshitha',
    '250305': 'Akanksha Bonike',
    '250507': 'Abhinav Kotagiri',
    '250321': 'Urkonda Ramanjaneyulu',
    '250521': 'Charan tridandapani',
    '250610': 'Bandi Mahendra',
    '250522': 'Bunga Pravalika'
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
  }, []);

  const checkExistingSession = async () => {
    const savedSession = localStorage.getItem('workZenSession');
    
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        console.log('Found saved session:', session);
        
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

  // Session timer effect
  useEffect(() => {
    let interval;
    
    if (isLoggedIn && currentSession) {
      console.log('Starting session timer with:', currentSession);
      
      const startSessionTimer = () => {
        const loginDateTime = new Date(`${currentSession.date} ${currentSession.loginTime}`);
        const maxSessionDuration = 9 * 60 * 60 * 1000; // 9 hours
        const gracePeriod = 60 * 60 * 1000; // 1 hour grace

        const updateTimer = () => {
          const now = new Date();
          const diffMs = now - loginDateTime;
          const totalAllowed = maxSessionDuration + gracePeriod;
          
          if (diffMs > totalAllowed) {
            setSessionExpired(true);
            showToast('Session expired! Please login again.', 'error');
            handleAutoLogout();
            return;
          }

          if (diffMs > maxSessionDuration) {
            const graceTimeLeft = totalAllowed - diffMs;
            const graceMinutes = Math.floor(graceTimeLeft / (1000 * 60));
            const graceSeconds = Math.floor((graceTimeLeft % (1000 * 60)) / 1000);
            
            setSessionExpired(true);
            setMessage(`⚠️ Session expired! Logout within ${graceMinutes}:${graceSeconds.toString().padStart(2, '0')}`);
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

  const checkServerSession = async (employeeId) => {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkSession',
          employeeId: employeeId
        }),
      });
      
      const text = await response.text();
      if (response.ok) {
        const data = JSON.parse(text);
        return data.hasActiveSession;
      }
      return false;
    } catch (error) {
      console.error('Error checking server session:', error);
      return false;
    }
  };

  const handleAutoLogout = async () => {
    if (!isLoggedIn || !employeeId.trim()) return;

    try {
      const currentDate = new Date();
      const payload = {
        action: 'logout',
        employeeId: employeeId.trim(),
        logoutTime: currentDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        logoutDate: currentDate.toISOString().split('T')[0],
        autoLogout: true
      };

      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Auto-logout error:', error);
    } finally {
      localStorage.removeItem('workZenSession');
      setIsLoggedIn(false);
      setEmployeeId('');
      setEmployeeName('');
      setSessionDuration('');
      setCurrentSession(null);
      setSessionExpired(false);
    }
  };

  const sendRequest = async (payload) => {
    console.log('Sending payload:', payload);
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', text);
      if (!response.ok) throw new Error(`Network error! Status: ${response.status}, Text: ${text}`);
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Fetch error:', error);
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return { status: 'success', message: 'Request sent (no-cors mode)' };
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
      // Check for existing session on server
      const hasActiveSession = await checkServerSession(employeeId);
      if (hasActiveSession) {
        // If server says there's an active session but we don't have it locally,
        // we need to restore the session so logout button works
        showToast('Active session found. Restoring session...', 'info');
        
        // Try to get the session details from server or create a dummy session
        const currentDate = new Date();
        const sessionData = {
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginTime: currentDate.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          date: currentDate.toISOString().split('T')[0]
        };
        
        // Save to localStorage so logout button works
        localStorage.setItem('workZenSession', JSON.stringify(sessionData));
        
        // Update state to enable logout button
        setIsLoggedIn(true);
        setCurrentSession(sessionData);
        setSessionExpired(false);
        
        showToast('Session restored. You can now logout.', 'success');
        setLoading(false);
        return;
      }

      const currentDate = new Date();
      const payload = {
        action: 'login',
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        loginTime: currentDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      };

      const responseData = await sendRequest(payload);

      if (responseData.status === 'success' || responseData.message.includes('no-cors')) {
        const sessionData = {
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginTime: payload.loginTime,
          date: payload.date
        };
        
        // Save to localStorage immediately
        localStorage.setItem('workZenSession', JSON.stringify(sessionData));
        
        // Update state
        setIsLoggedIn(true);
        setCurrentSession(sessionData);
        setSessionExpired(false);
        showToast('Login successful! Timer started.', 'success');
      } else {
        throw new Error(responseData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message.includes('already logged in')) {
        showToast('You already have an active session! Session restored.', 'info');
        
        // Restore session when server says already logged in
        const currentDate = new Date();
        const sessionData = {
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginTime: currentDate.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          date: currentDate.toISOString().split('T')[0]
        };
        
        localStorage.setItem('workZenSession', JSON.stringify(sessionData));
        setIsLoggedIn(true);
        setCurrentSession(sessionData);
      } else {
        showToast('Login failed. Please try again.', 'error');
      }
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
    setMessage('');

    try {
      const currentDate = new Date();
      const payload = {
        action: 'logout',
        employeeId: employeeId.trim(),
        logoutTime: currentDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        logoutDate: currentDate.toISOString().split('T')[0]
      };

      const responseData = await sendRequest(payload);

      if (responseData.status === 'success' || responseData.message.includes('no-cors')) {
        // Clear everything
        localStorage.removeItem('workZenSession');
        setIsLoggedIn(false);
        setEmployeeId('');
        setEmployeeName('');
        setSessionDuration('');
        setCurrentSession(null);
        setSessionExpired(false);
        showToast('Logout successful!', 'success');
      } else {
        throw new Error(responseData.message || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Logout failed. Please try again.', 'error');
      // Still clear local session even if server fails
      localStorage.removeItem('workZenSession');
      setIsLoggedIn(false);
      setEmployeeId('');
      setEmployeeName('');
      setSessionDuration('');
      setCurrentSession(null);
      setSessionExpired(false);
    } finally {
      setLoading(false);
    }
  };

  // Clear stuck session function
  const handleClearStuckSession = async () => {
    if (!employeeId.trim()) {
      showToast('Please enter Employee ID first', 'error');
      return;
    }

    setLoading(true);
    try {
      // Force logout to clear stuck session
      const currentDate = new Date();
      const payload = {
        action: 'logout',
        employeeId: employeeId.trim(),
        logoutTime: currentDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        logoutDate: currentDate.toISOString().split('T')[0],
        forceLogout: true
      };

      await sendRequest(payload);
      localStorage.removeItem('workZenSession');
      setIsLoggedIn(false);
      setEmployeeId('');
      setEmployeeName('');
      setSessionDuration('');
      setCurrentSession(null);
      setSessionExpired(false);
      showToast('Stuck session cleared! You can now login.', 'success');
    } catch (error) {
      showToast('Failed to clear session. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
          toast.type === 'error' ? 'bg-red-500 text-white' :
          toast.type === 'success' ? 'bg-green-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#ffc947] to-[#202426] bg-clip-text text-transparent">
            WORKZEN
          </h1>
          <p className="text-gray-600">Employee Attendance Tracking System</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                Employee ID *
              </label>
              {isLoggedIn && sessionDuration && (
                <div className={`text-base font-mono font-bold ${
                  sessionExpired ? 'text-red-600' : 'text-blue-800'
                }`}>
                  {sessionDuration}
                </div>
              )}
            </div>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={handleEmployeeIdChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         focus:outline-none focus:ring-2 focus:ring-[#ffc947] focus:border-[#ffc947]
                         hover:border-[#ffc947] transition-colors"
              placeholder="Enter your employee ID"
              required
              disabled={loading}
              list="employeeIds"
            />
            <datalist id="employeeIds">
              {Object.keys(employeeData).map(id => (
                <option key={id} value={id} />
              ))}
            </datalist>
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
              disabled={loading}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || isLoggedIn}
              className="flex-1 bg-[#ffc947] text-[#202426] py-2 px-3 rounded-md 
                         hover:bg-[#202426] hover:text-[#ffc947] focus:outline-none focus:ring-2 
                         focus:ring-[#ffc947] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors font-medium text-sm flex items-center justify-center"
            >
              {loading && !isLoggedIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#202426] border-t-transparent mr-2"></div>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !isLoggedIn}
              className="flex-1 bg-[#202426] text-[#ffc947] py-2 px-3 rounded-md 
                         hover:bg-[#ffc947] hover:text-[#202426] focus:outline-none focus:ring-2 
                         focus:ring-[#202426] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors font-medium text-sm flex items-center justify-center"
            >
              {loading && isLoggedIn ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#ffc947] border-t-transparent mr-2"></div>
                  Logging out...
                </>
              ) : (
                'Logout'
              )}
            </button>
          </div>
        </form>

        {/* Clear stuck session button */}
        {!isLoggedIn && employeeId && (
          <div className="mt-4 text-center">
            <button
              onClick={handleClearStuckSession}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear stuck session?
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {isLoggedIn
              ? `Session active for ${employeeName} (ID: ${employeeId})`
              : 'Enter your Employee ID to start tracking time'}
          </p>
          {/* <p className="text-xs text-gray-400 text-center mt-1">
            • Auto-logout after 9 hours • 1 hour grace period •
          </p> */}
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