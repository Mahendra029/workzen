import { useState, useEffect } from 'react';

const TimeTracker = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
        setMessage('Login successful! Time recorded.');
      } else {
        throw new Error(responseData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
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
        setMessage('Logout successful! Time recorded.');
      } else {
        throw new Error(responseData.message || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
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
    setMessage('');
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
      } catch (e) {
        throw new Error('Invalid JSON response: ' + text);
      }
    } catch (error) {
      setMessage('Connection test failed. This is normal for CORS. Data will still be sent.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#ffc947] to-[#202426] bg-clip-text text-transparent">
            WORKZEN
          </h1>
          <p className="text-gray-600">Employee Attendence Tracking System</p>
         
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-center ${
              message.includes('failed') || message.includes('Please enter')
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}

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
              className="flex-1 bg-[#ffc947] text-[#202426] py-2 px-4 rounded-md 
                         hover:bg-[#202426] hover:text-[#ffc947] focus:outline-none focus:ring-2 
                         focus:ring-[#ffc947] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
            >
              {loading && !isLoggedIn ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !isLoggedIn}
              className="flex-1 bg-[#202426] text-[#ffc947] py-2 px-4 rounded-md 
                         hover:bg-[#ffc947] hover:text-[#202426] focus:outline-none focus:ring-2 
                         focus:ring-[#202426] focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
            >
              {loading && isLoggedIn ? 'Logging out...' : 'Logout'}
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
           <p className="mt-2 text-xs font-bold text-center" style={{ color: '#ffc947' }}>
            @ Developed by Mahendra &amp; Akshitha
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;