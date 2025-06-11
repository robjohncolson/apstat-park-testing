import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { findTopicById, findUnitById } from '../data/allUnitsData';
import type { Topic, Unit } from '../data/allUnitsData';

export function LessonPage() {
  const { unitId, lessonId } = useParams<{ unitId: string; lessonId: string }>();
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load lesson data and progress
  useEffect(() => {
    if (!unitId || !lessonId) return;

    const foundUnit = findUnitById(unitId);
    const foundTopic = findTopicById(unitId, lessonId);

    setUnit(foundUnit || null);
    setTopic(foundTopic || null);

    // Fetch progress for this specific lesson
    const fetchProgress = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/api/users/${user.id}/progress`);
        if (response.ok) {
          const progressData = await response.json();
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId && p.lesson_completed
          );
          setIsCompleted(!!lessonProgress);
        } else {
          // Offline mode - check localStorage
          const offlineProgress = localStorage.getItem(`progress_${user.id}`);
          if (offlineProgress) {
            const progressData = JSON.parse(offlineProgress);
            const lessonProgress = progressData.find(
              (p: any) => p.lesson_id === lessonId && p.lesson_completed
            );
            setIsCompleted(!!lessonProgress);
          }
        }
      } catch (error) {
        console.warn('API not available - running in offline mode');
        // Offline mode - check localStorage
        const offlineProgress = localStorage.getItem(`progress_${user.id}`);
        if (offlineProgress) {
          const progressData = JSON.parse(offlineProgress);
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId && p.lesson_completed
          );
          setIsCompleted(!!lessonProgress);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [unitId, lessonId, user?.id]);

  // Handle marking lesson as complete
  const handleMarkComplete = async () => {
    if (!user?.id || !lessonId || isUpdating) return;

    setIsUpdating(true);
    
    // Optimistic update - immediately update UI
    const previousState = isCompleted;
    setIsCompleted(true);

    const progressEntry = {
      lesson_id: lessonId,
      lesson_completed: true,
      completion_date: new Date().toISOString(),
    };

    try {
      const response = await fetch(`http://localhost:3001/api/users/${user.id}/progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to sync progress');
      }

      // Emit WebSocket activity (if available)
      // TODO: Implement WebSocket connection
      // socket.emit('user_activity', {
      //   user_id: user.id,
      //   lesson_id: lessonId,
      //   activity_type: 'lesson_completed'
      // });

    } catch (error) {
      console.warn('API not available - saving progress locally');
      
      // Save to localStorage in offline mode
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      let progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
      
      // Update or add progress entry
      const existingIndex = progressData.findIndex((p: any) => p.lesson_id === lessonId);
      if (existingIndex >= 0) {
        progressData[existingIndex] = progressEntry;
      } else {
        progressData.push(progressEntry);
      }
      
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
      console.log('Progress saved locally for offline use');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="lesson-page">
        <div className="loading-spinner">
          <p>Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!topic || !unit) {
    return (
      <div className="lesson-page">
        <header className="lesson-header">
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
          <div className="lesson-info">
            <h1>Lesson Not Found</h1>
            <p>Could not find lesson {lessonId} in unit {unitId}</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="lesson-page">
      <header className="lesson-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
        <div className="lesson-info">
          <h1>{topic.name}</h1>
          <p>{unit.displayName}</p>
          {isCompleted && <span className="completion-badge">✅ Completed</span>}
        </div>
        <div className="lesson-actions">
          {!isCompleted && (
            <button 
              className="complete-btn"
              onClick={handleMarkComplete}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Mark as Complete'}
            </button>
          )}
        </div>
      </header>

      <main className="lesson-main">
        <div className="lesson-content">
          <section className="lesson-description">
            <h2>{topic.description}</h2>
          </section>

          {/* Videos Section */}
          {topic.videos.length > 0 && (
            <section className="content-section">
              <h3>📺 Videos</h3>
              <div className="videos-grid">
                {topic.videos.map((video, index) => (
                  <div key={index} className="video-card">
                    <h4>Video {index + 1}</h4>
                    <div className="video-links">
                      <a 
                        href={video.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="video-link primary"
                      >
                        Watch on AP Classroom
                      </a>
                      {video.altUrl && (
                        <a 
                          href={video.altUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link secondary"
                        >
                          Alternative Link
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quizzes Section */}
          {topic.quizzes.length > 0 && (
            <section className="content-section">
              <h3>📝 Quizzes</h3>
              <div className="quizzes-grid">
                {topic.quizzes.map((quiz, index) => (
                  <div key={quiz.quizId} className="quiz-card">
                    <h4>Quiz {index + 1}</h4>
                    <div className="quiz-links">
                      {quiz.questionPdf && (
                        <a 
                          href={quiz.questionPdf} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="quiz-link"
                        >
                          📄 Questions
                        </a>
                      )}
                      <a 
                        href={quiz.answersPdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="quiz-link"
                      >
                        📄 Answers
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Blooket Section */}
          {topic.blooket.url && (
            <section className="content-section">
              <h3>🎮 Blooket Game</h3>
              <div className="blooket-card">
                <p>Test your knowledge with this interactive game!</p>
                <a 
                  href={topic.blooket.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="blooket-link"
                >
                  Play Blooket Game
                </a>
              </div>
            </section>
          )}

          {/* Origami Section */}
          {topic.origami && (
            <section className="content-section">
              <h3>🎨 Origami Activity</h3>
              <div className="origami-card">
                <h4>{topic.origami.name}</h4>
                <p className="origami-description">{topic.origami.description}</p>
                <a 
                  href={topic.origami.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="origami-link"
                >
                  Watch Origami Tutorial
                </a>
                <div className="reflection">
                  <h5>💭 Reflection</h5>
                  <p>{topic.origami.reflection}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
} 