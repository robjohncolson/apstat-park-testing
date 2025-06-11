import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { BookmarkProvider, useBookmark } from './context/BookmarkContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LessonPage } from './pages/LessonPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import './App.css'

// Global Bookmark Star Component
function GlobalBookmarkStar() {
  const { activeBookmark, navigateToBookmark, clearBookmark } = useBookmark();
  
  if (!activeBookmark) return null;
  
  const handleClick = () => {
    const url = navigateToBookmark();
    if (url) {
      window.location.href = url; // Simple navigation for now
    }
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearBookmark();
  };
  
  return (
    <div 
      className="global-bookmark-star"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#ffd700',
        color: '#333',
        padding: '0.5rem 1rem',
        borderRadius: '25px',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: 500,
      }}
      onClick={handleClick}
      title={`Go to bookmarked ${activeBookmark.item_type || 'lesson'}: ${activeBookmark.item_title || activeBookmark.lesson_title}`}
    >
      ⭐ {activeBookmark.item_title || activeBookmark.lesson_title}
      <button
        onClick={handleClear}
        style={{
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0',
          marginLeft: '0.25rem',
        }}
        title="Clear bookmark"
      >
        ×
      </button>
    </div>
  );
}

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
    <BookmarkProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="app">
          {isAuthenticated && <GlobalBookmarkStar />}
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
    </BookmarkProvider>
  )
}

export default App
