import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LessonPage } from './pages/LessonPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import './App.css'

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">
          <h1>🏞️ APStat Park</h1>
          <p>Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/unit/:unitId/lesson/:lessonId" 
            element={isAuthenticated ? <LessonPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/leaderboard" 
            element={isAuthenticated ? <LeaderboardPage /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
