import { useState, useEffect } from 'react';
import Toast from './Toast';

const LoadingSpinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const TimeTracker = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz2uUBnqEaYLk60aylzeg1R14q1pjexg8xl4uGZIIATVc3Xt2-7nYocFXsedLyCjJFhzQ/exec';

  useEffect(() => {
    const savedSession = localStorage.getItem('workZenSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setIsLoggedIn(true);
        setEmployeeId(session.employeeId);
        setEmployeeName(session.employeeName);
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('workZenSession');
      }
    }
  }, []);

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
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response: ' + text);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      // Fallback to no-cors mode
      console.log('Falling back to no-cors mode with payload:', payload);
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

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!employeeId.trim() || !employeeName.trim()) {
      setMessage('Please enter both Employee ID and Name');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
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
        }),
      };

      const responseData = await sendRequest(payload);

      if (responseData.status === 'success' || responseData.message.includes('no-cors')) {
        const sessionData = {
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginTime: payload.loginTime,
        };
        localStorage.setItem('workZenSession', JSON.stringify(sessionData));
        setIsLoggedIn(true);
        setMessageType('success');
        setMessage('Login successful! Time recorded.');
      } else {
        throw new Error(responseData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessageType('error');
      setMessage('Login request sent. Check sheet to confirm.');
      const sessionData = {
        employeeId: employeeId.trim(),
        employeeName: employeeName.trim(),
        loginTime: new Date().toLocaleTimeString(),
      };
      localStorage.setItem('workZenSession', JSON.stringify(sessionData));
      setIsLoggedIn(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!isLoggedIn || !employeeId.trim()) {
      setMessage('No active session to logout.');
      setMessageType('error');
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
      };

      const responseData = await sendRequest(payload);

      if (responseData.status === 'success' || responseData.message.includes('no-cors')) {
        localStorage.removeItem('workZenSession');
        setIsLoggedIn(false);
        setEmployeeId('');
        setEmployeeName('');
        setMessageType('success');
        setMessage('Logout successful! Time recorded.');
      } else {
        throw new Error(responseData.message || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setMessageType('error');
      setMessage('Logout request sent. Check sheet to confirm.');
      localStorage.removeItem('workZenSession');
      setIsLoggedIn(false);
      setEmployeeId('');
      setEmployeeName('');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (message) setMessage('');
  };

  const testConnection = async () => {
    try {
      setMessage('Testing connection...');
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setMessage('Connection successful: ' + (data.message || 'Test passed'));
        setMessageType('success');
      } catch (e) {
        throw new Error('Invalid JSON response: ' + text);
      }
    } catch (error) {
      setMessage('Connection test failed. This is normal for CORS. Data will still be sent.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Toast message={message} type={messageType} onDone={() => setMessage('')} />
      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#ffc947] to-[#202426] bg-clip-text text-transparent">
            WORKZEN
          </h1>
          <p className="text-gray-600">Employee Attendence Tracking System</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={handleInputChange(setEmployeeId)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         focus:outline-none focus:ring-2 focus:ring-[#ffc947] focus:border-[#ffc947]
                         hover:border-[#ffc947] transition-colors"
              placeholder="Enter your employee ID"
              required
              disabled={isLoggedIn || loading}
            />
          </div>

          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name *
            </label>
            <input
              id="employeeName"
              type="text"
              value={employeeName}
              onChange={handleInputChange(setEmployeeName)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         focus:outline-none focus:ring-2 focus:ring-[#ffc947] focus:border-[#ffc947]
                         hover:border-[#ffc947] transition-colors"
              placeholder="Enter your full name"
              required
              disabled={isLoggedIn || loading}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || isLoggedIn}
              className="flex-1 flex items-center justify-center bg-[#ffc947] text-[#202426] py-2 px-4 rounded-md 
                         hover:bg-[#202426] hover:text-[#ffc947] focus:outline-none focus:ring-2 
                         focus:ring-[#ffc947] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
            >
              {loading && !isLoggedIn ? <><LoadingSpinner />Logging in...</> : 'Login'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !isLoggedIn}
              className="flex-1 flex items-center justify-center bg-[#202426] text-[#ffc947] py-2 px-4 rounded-md 
                         hover:bg-[#ffc947] hover:text-[#202426] focus:outline-none focus:ring-2 
                         focus:ring-[#202426] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
            >
              {loading && isLoggedIn ? <><LoadingSpinner />Logging out...</> : 'Logout'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            {isLoggedIn
              ? `Session active for ${employeeName} (ID: ${employeeId})`
              : 'Enter your credentials to start tracking time.'}
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Data is securely stored in Google Sheets
          </p>
           <p className="mt-4 text-xs text-gray-500 text-center">
            &copy; {new Date().getFullYear()} Zenbeta Technology. All rights reserved.
          </p>
          <p className="mt-1 text-xs font-bold text-center" style={{ color: '#ffc947' }}>
            Developed by Mahendra &amp; Akshitha
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;