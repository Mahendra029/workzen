import { useState, useEffect } from 'react'

const TimeTracker = () => {
  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Replace with your deployed Google Apps Script URL
  const SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxlLd8ge_e4mnaFiMQAMQPqSDb-vu0paJDuubJJNuBPbnxgU2UHdMhQwqz3q1-MeNRL4A/exec'

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const savedSession = localStorage.getItem('workZenSession')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setIsLoggedIn(true)
        setEmployeeId(session.employeeId)
        setEmployeeName(session.employeeName)
      } catch (error) {
        console.error('Error parsing saved session:', error)
        localStorage.removeItem('workZenSession')
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!employeeId.trim() || !employeeName.trim()) {
      setMessage('Please enter both Employee ID and Name')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const currentDate = new Date()
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
      }

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to log in')

      const responseData = await response.json()

      if (responseData.status === 'success') {
        const sessionData = {
          employeeId: employeeId.trim(),
          employeeName: employeeName.trim(),
          loginTime: payload.loginTime,
        }
        localStorage.setItem('workZenSession', JSON.stringify(sessionData))
        setIsLoggedIn(true)
        setMessage(responseData.message || 'Login successful!')
      } else {
        setMessage(responseData.message || 'Login failed.')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error logging in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setMessage('')

    try {
      const currentDate = new Date()
      const payload = {
        action: 'logout',
        employeeId: employeeId.trim(),
        logoutTime: currentDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      }

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to log out')

      const responseData = await response.json()

      if (responseData.status === 'success') {
        localStorage.removeItem('workZenSession')
        setIsLoggedIn(false)
        setEmployeeId('')
        setEmployeeName('')
        setMessage(responseData.message || 'Logout successful!')
      } else {
        setMessage(responseData.message || 'Logout failed.')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error logging out. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value)
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">WorkZen Attendance</h1>
          <p className="text-gray-600">Employee Time Tracking System</p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-center ${
              message.includes('Error')
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}

        <form className="space-y-4">
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent"
              placeholder="Enter your employee ID"
              required
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
                         focus:outline-none focus:ring-2 focus:ring-blue-500 
                         focus:border-transparent"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              onClick={handleLogin}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 focus:ring-offset-2 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-colors"
            >
              {loading && !isLoggedIn ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !isLoggedIn}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md 
                         hover:bg-red-700 focus:outline-none focus:ring-2 
                         focus:ring-red-500 focus:ring-offset-2 
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
        </div>
      </div>
    </div>
  )
}

export default TimeTracker
