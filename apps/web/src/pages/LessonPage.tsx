import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../context/BookmarkContext';
import { findTopicById, findUnitById } from '../data/allUnitsData';
import type { Topic, Unit } from '../data/allUnitsData';

// Interface for granular progress tracking
interface LessonProgress {
  lesson_id: string;
  videos_watched: number[];
  quizzes_completed: number[];
  blooket_completed?: boolean;
  origami_completed?: boolean;
  lesson_completed?: boolean;
}

export function LessonPage() {
  const { unitId, lessonId } = useParams<{ unitId: string; lessonId: string }>();
  const { user } = useAuth();
  const { setBookmark, isItemBookmarked } = useBookmark();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

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
        const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress`);
        if (response.ok) {
          const progressData = await response.json();
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId
          );
          if (lessonProgress) {
            setProgress({
              lesson_id: lessonProgress.lesson_id,
              videos_watched: lessonProgress.videos_watched || [],
              quizzes_completed: lessonProgress.quizzes_completed || [],
              blooket_completed: lessonProgress.blooket_completed || false,
              origami_completed: lessonProgress.origami_completed || false,
              lesson_completed: lessonProgress.lesson_completed || false,
            });
          } else {
            // No progress yet, initialize empty state
            setProgress({
              lesson_id: lessonId,
              videos_watched: [],
              quizzes_completed: [],
              blooket_completed: false,
              origami_completed: false,
              lesson_completed: false,
            });
          }
        } else {
          // Offline mode - check localStorage
          const offlineProgress = localStorage.getItem(`progress_${user.id}`);
          if (offlineProgress) {
            const progressData = JSON.parse(offlineProgress);
            const lessonProgress = progressData.find(
              (p: any) => p.lesson_id === lessonId
            );
            if (lessonProgress) {
              setProgress({
                lesson_id: lessonProgress.lesson_id,
                videos_watched: lessonProgress.videos_watched || [],
                quizzes_completed: lessonProgress.quizzes_completed || [],
                blooket_completed: lessonProgress.blooket_completed || false,
                origami_completed: lessonProgress.origami_completed || false,
                lesson_completed: lessonProgress.lesson_completed || false,
              });
            } else {
              setProgress({
                lesson_id: lessonId,
                videos_watched: [],
                quizzes_completed: [],
                blooket_completed: false,
                origami_completed: false,
                lesson_completed: false,
              });
            }
          }
        }
      } catch (error) {
        console.warn('API not available - running in offline mode');
        // Offline mode - check localStorage
        const offlineProgress = localStorage.getItem(`progress_${user.id}`);
        if (offlineProgress) {
          const progressData = JSON.parse(offlineProgress);
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId
          );
          if (lessonProgress) {
            setProgress({
              lesson_id: lessonProgress.lesson_id,
              videos_watched: lessonProgress.videos_watched || [],
              quizzes_completed: lessonProgress.quizzes_completed || [],
              blooket_completed: lessonProgress.blooket_completed || false,
              origami_completed: lessonProgress.origami_completed || false,
              lesson_completed: lessonProgress.lesson_completed || false,
            });
          } else {
            setProgress({
              lesson_id: lessonId,
              videos_watched: [],
              quizzes_completed: [],
              blooket_completed: false,
              origami_completed: false,
              lesson_completed: false,
            });
          }
        } else {
          // No offline data, initialize empty
          setProgress({
            lesson_id: lessonId,
            videos_watched: [],
            quizzes_completed: [],
            blooket_completed: false,
            origami_completed: false,
            lesson_completed: false,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [unitId, lessonId, user?.id]);

  // Handle marking lesson as complete
  const handleMarkComplete = async () => {
    if (!user?.id || !lessonId || updatingItems.size > 0) return;

    setUpdatingItems(new Set([lessonId]));
    
    // Optimistic update - immediately update UI
    const previousState = progress;
    setProgress(prev => ({
      lesson_id: lessonId!,
      videos_watched: prev?.videos_watched || [],
      quizzes_completed: prev?.quizzes_completed || [],
      blooket_completed: prev?.blooket_completed || false,
      origami_completed: prev?.origami_completed || false,
      lesson_completed: true,
    }));

    const progressEntry = {
      lesson_id: lessonId,
      lesson_completed: true,
      completion_date: new Date().toISOString(),
    };

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress/sync`, {
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
      setUpdatingItems(new Set());
    }
  };

  // Handle marking individual video as watched
  const handleVideoWatched = async (videoIndex: number) => {
    if (!user?.id || !lessonId || !progress || updatingItems.has(`video-${videoIndex}`)) return;

    const itemKey = `video-${videoIndex}`;
    setUpdatingItems(prev => new Set([...prev, itemKey]));

    // Optimistic update
    const previousProgress = progress;
    if (!(progress.videos_watched || []).includes(videoIndex)) {
      setProgress(prev => prev ? {
        ...prev,
        videos_watched: [...(prev.videos_watched || []), videoIndex]
      } : null);
    }

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          video_index: videoIndex,
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync video progress');
      }

      console.log(`Video ${videoIndex} marked as watched for lesson ${lessonId}`);
    } catch (error) {
      console.warn('API not available - saving video progress locally');
      
      // Fallback to localStorage
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      let progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
      
      const existingIndex = progressData.findIndex((p: any) => p.lesson_id === lessonId);
      if (existingIndex >= 0) {
        const existing = progressData[existingIndex];
        // Ensure videos_watched is an array
        if (!existing.videos_watched) {
          existing.videos_watched = [];
        }
        if (!existing.videos_watched.includes(videoIndex)) {
          existing.videos_watched.push(videoIndex);
        }
      } else {
        progressData.push({
          lesson_id: lessonId,
          videos_watched: [videoIndex],
          quizzes_completed: [],
          blooket_completed: false,
          origami_completed: false,
          lesson_completed: false,
        });
      }
      
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Handle marking individual quiz as completed
  const handleQuizCompleted = async (quizIndex: number) => {
    if (!user?.id || !lessonId || !progress || updatingItems.has(`quiz-${quizIndex}`)) return;

    const itemKey = `quiz-${quizIndex}`;
    setUpdatingItems(prev => new Set([...prev, itemKey]));

    // Optimistic update - immediately update UI
    const previousState = progress;
    setProgress(prev => ({
      ...prev!,
      quizzes_completed: [...(prev!.quizzes_completed || []), quizIndex].filter((v, i, arr) => 
        arr.indexOf(v) === i
      ),
    }));

    const progressEntry = {
      lesson_id: lessonId,
      videos_watched: progress.videos_watched,
      quizzes_completed: [...(progress.quizzes_completed || []), quizIndex].filter((v, i, arr) => 
        arr.indexOf(v) === i
      ),
      blooket_completed: progress.blooket_completed,
      origami_completed: progress.origami_completed,
    };

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to sync progress');
      }

    } catch (error) {
      console.warn('API not available - saving quiz progress locally');
      
      // Fallback to localStorage
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      let progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
      
      const existingIndex = progressData.findIndex((p: any) => p.lesson_id === lessonId);
      if (existingIndex >= 0) {
        const existing = progressData[existingIndex];
        // Ensure quizzes_completed is an array
        if (!existing.quizzes_completed) {
          existing.quizzes_completed = [];
        }
        if (!existing.quizzes_completed.includes(quizIndex)) {
          existing.quizzes_completed.push(quizIndex);
        }
      } else {
        progressData.push({
          lesson_id: lessonId,
          videos_watched: [],
          quizzes_completed: [quizIndex],
          blooket_completed: false,
          origami_completed: false,
          lesson_completed: false,
        });
      }
      
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Handle marking Blooket as completed
  const handleBlooketCompleted = async () => {
    if (!user?.id || !lessonId || !progress || updatingItems.has('blooket')) return;

    const itemKey = 'blooket';
    const newCompletionState = !progress.blooket_completed;
    
    setUpdatingItems(prev => new Set([...prev, itemKey]));

    // Optimistic update - immediately update UI
    setProgress(prev => ({
      ...prev!,
      blooket_completed: newCompletionState,
    }));

    const progressEntry = {
      lesson_id: lessonId,
      videos_watched: progress.videos_watched || [],
      quizzes_completed: progress.quizzes_completed || [],
      blooket_completed: newCompletionState,
      origami_completed: progress.origami_completed || false,
    };

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to sync progress');
      }

    } catch (error) {
      console.warn('API not available - saving blooket progress locally');
      
      // Fallback to localStorage
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      let progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
      
      const existingIndex = progressData.findIndex((p: any) => p.lesson_id === lessonId);
      if (existingIndex >= 0) {
        progressData[existingIndex].blooket_completed = newCompletionState;
      } else {
        progressData.push({
          lesson_id: lessonId,
          videos_watched: [],
          quizzes_completed: [],
          blooket_completed: newCompletionState,
          origami_completed: false,
          lesson_completed: false,
        });
      }
      
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Handle marking Origami as completed
  const handleOrigamiCompleted = async () => {
    if (!user?.id || !lessonId || !progress || updatingItems.has('origami')) return;

    const itemKey = 'origami';
    const newCompletionState = !progress.origami_completed;
    
    setUpdatingItems(prev => new Set([...prev, itemKey]));

    // Optimistic update - immediately update UI
    setProgress(prev => ({
      ...prev!,
      origami_completed: newCompletionState,
    }));

    const progressEntry = {
      lesson_id: lessonId,
      videos_watched: progress.videos_watched || [],
      quizzes_completed: progress.quizzes_completed || [],
      blooket_completed: progress.blooket_completed || false,
      origami_completed: newCompletionState,
    };

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}/progress/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progressEntry),
      });

      if (!response.ok) {
        throw new Error('Failed to sync progress');
      }

    } catch (error) {
      console.warn('API not available - saving origami progress locally');
      
      // Fallback to localStorage
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      let progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
      
      const existingIndex = progressData.findIndex((p: any) => p.lesson_id === lessonId);
      if (existingIndex >= 0) {
        progressData[existingIndex].origami_completed = newCompletionState;
      } else {
        progressData.push({
          lesson_id: lessonId,
          videos_watched: [],
          quizzes_completed: [],
          blooket_completed: false,
          origami_completed: newCompletionState,
          lesson_completed: false,
        });
      }
      
      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Handle bookmarking a video
  const handleBookmarkVideo = async (videoIndex: number) => {
    if (!topic || !unit) return;
    
    await setBookmark({
      lesson_id: lessonId!,
      lesson_title: topic.name,
      unit_id: unitId!,
      bookmark_type: 'item',
      item_index: videoIndex,
      item_type: 'video',
      item_title: `${topic.name} - Video ${videoIndex + 1}`,
    });
  };

  // Handle bookmarking a quiz
  const handleBookmarkQuiz = async (quizIndex: number) => {
    if (!topic || !unit) return;
    
    await setBookmark({
      lesson_id: lessonId!,
      lesson_title: topic.name,
      unit_id: unitId!,
      bookmark_type: 'item',
      item_index: quizIndex,
      item_type: 'quiz',
      item_title: `${topic.name} - Quiz ${quizIndex + 1}`,
    });
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
          {progress?.lesson_completed && <span className="completion-badge">✅ Completed</span>}
        </div>
        <div className="lesson-actions">
          {!progress?.lesson_completed && (
            <button 
              className="complete-btn"
              onClick={handleMarkComplete}
              disabled={updatingItems.size > 0}
            >
              {updatingItems.size > 0 ? 'Saving...' : 'Mark as Complete'}
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
                {topic.videos.map((video, index) => {
                  const videoIndex = video.index ?? index;
                  const isWatched = progress?.videos_watched.includes(videoIndex) || false;
                  const isUpdating = updatingItems.has(`video-${videoIndex}`);
                  const isBookmarked = isItemBookmarked(lessonId!, 'video', videoIndex);
                  
                  return (
                  <div key={index} className="video-card">
                    <div className="video-header">
                      <h4>Video {index + 1}</h4>
                      <div className="video-header-actions">
                        {isWatched && <span className="completion-indicator">✅ Watched</span>}
                        <button
                          className="bookmark-btn"
                          onClick={() => handleBookmarkVideo(videoIndex)}
                          disabled={isBookmarked}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: isBookmarked ? 'not-allowed' : 'pointer',
                            opacity: isBookmarked ? 0.5 : 1,
                            marginLeft: '0.5rem',
                          }}
                          title={isBookmarked ? 'Already bookmarked' : 'Bookmark this video'}
                        >
                          {isBookmarked ? '📌' : '📍'}
                        </button>
                      </div>
                    </div>
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
                    <div className="item-actions">
                      <button
                        className={`item-complete-btn ${isWatched ? 'completed' : ''}`}
                        onClick={() => handleVideoWatched(videoIndex)}
                        disabled={isWatched || isUpdating}
                        style={{
                          background: isWatched ? '#28a745' : '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: isWatched || isUpdating ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          marginTop: '0.5rem',
                          width: '100%'
                        }}
                      >
                        {isUpdating ? 'Saving...' : isWatched ? '✓ Watched' : 'Mark as Watched'}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quizzes Section */}
          {topic.quizzes.length > 0 && (
            <section className="content-section">
              <h3>📝 Quizzes</h3>
              <div className="quizzes-grid">
                {topic.quizzes.map((quiz, index) => {
                  const quizIndex = quiz.index ?? index;
                  const isCompleted = progress?.quizzes_completed.includes(quizIndex) || false;
                  const isUpdating = updatingItems.has(`quiz-${quizIndex}`);
                  const isBookmarked = isItemBookmarked(lessonId!, 'quiz', quizIndex);
                  
                  return (
                  <div key={quiz.quizId} className="quiz-card">
                    <div className="quiz-header">
                      <h4>Quiz {index + 1}</h4>
                      <div className="quiz-header-actions">
                        {isCompleted && <span className="completion-indicator">✅ Complete</span>}
                        <button
                          className="bookmark-btn"
                          onClick={() => handleBookmarkQuiz(quizIndex)}
                          disabled={isBookmarked}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: isBookmarked ? 'not-allowed' : 'pointer',
                            opacity: isBookmarked ? 0.5 : 1,
                            marginLeft: '0.5rem',
                          }}
                          title={isBookmarked ? 'Already bookmarked' : 'Bookmark this quiz'}
                        >
                          {isBookmarked ? '📌' : '📍'}
                        </button>
                      </div>
                    </div>
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
                    <div className="item-actions">
                      <button
                        className={`item-complete-btn ${isCompleted ? 'completed' : ''}`}
                        onClick={() => handleQuizCompleted(quizIndex)}
                        disabled={isCompleted || isUpdating}
                        style={{
                          background: isCompleted ? '#28a745' : '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: isCompleted || isUpdating ? 'not-allowed' : 'pointer',
                          fontSize: '0.9rem',
                          marginTop: '0.5rem',
                          width: '100%'
                        }}
                      >
                        {isUpdating ? 'Saving...' : isCompleted ? '✓ Complete' : 'Mark Complete'}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Blooket Section */}
          {topic.blooket.url && (
            <section className="content-section">
              <h3>🎮 Blooket Game</h3>
              <div className="blooket-card">
                <div className="blooket-header">
                  <h4>Interactive Review Game</h4>
                  <div className="blooket-header-actions">
                    {progress?.blooket_completed && <span className="completion-indicator">✅ Complete</span>}
                  </div>
                </div>
                <p>Test your knowledge with this interactive game!</p>
                <div className="blooket-links">
                  <a 
                    href={topic.blooket.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="blooket-link"
                  >
                    Play Blooket Game
                  </a>
                </div>
                <div className="item-actions">
                  <button
                    className={`item-complete-btn ${progress?.blooket_completed ? 'completed' : ''}`}
                    onClick={handleBlooketCompleted}
                    disabled={updatingItems.has('blooket')}
                    style={{
                      background: progress?.blooket_completed ? '#28a745' : '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: updatingItems.has('blooket') ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      width: '100%'
                    }}
                  >
                    {updatingItems.has('blooket') ? 'Saving...' : progress?.blooket_completed ? '✓ Done' : 'Mark Done'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Origami Section */}
          {topic.origami && (
            <section className="content-section">
              <h3>🎨 Origami Activity</h3>
              <div className="origami-card">
                <div className="origami-header">
                  <h4>{topic.origami.name}</h4>
                  <div className="origami-header-actions">
                    {progress?.origami_completed && <span className="completion-indicator">✅ Complete</span>}
                  </div>
                </div>
                <p className="origami-description">{topic.origami.description}</p>
                <div className="origami-links">
                  <a 
                    href={topic.origami.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="origami-link"
                  >
                    Watch Origami Tutorial
                  </a>
                </div>
                <div className="reflection">
                  <h5>💭 Reflection</h5>
                  <p>{topic.origami.reflection}</p>
                </div>
                <div className="item-actions">
                  <button
                    className={`item-complete-btn ${progress?.origami_completed ? 'completed' : ''}`}
                    onClick={handleOrigamiCompleted}
                    disabled={updatingItems.has('origami')}
                    style={{
                      background: progress?.origami_completed ? '#28a745' : '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: updatingItems.has('origami') ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      width: '100%'
                    }}
                  >
                    {updatingItems.has('origami') ? 'Saving...' : progress?.origami_completed ? '✓ Done' : 'Mark Done'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
} 