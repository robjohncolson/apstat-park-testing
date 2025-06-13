import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBookmark } from "../context/BookmarkContext";
import {
  findTopicById,
  findUnitById,
  calculateTopicFraction,
} from "../data/allUnitsData";
import type { Topic, Unit } from "../data/allUnitsData";
import { DEFAULT_GROK_PROMPT } from "../constants/grokPrompt";

// Interface for granular progress tracking
interface LessonProgress {
  lesson_id: string;
  videos_watched: number[];
  quizzes_completed: number[];
  blooket_completed?: boolean;
  origami_completed?: boolean;
  // lesson_completed removed - now calculated from fractional progress
}

export function LessonPage() {
  const { unitId, lessonId } = useParams<{
    unitId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const { setBookmark, isItemBookmarked } = useBookmark();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

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
        const response = await fetch(
          `http://localhost:3000/api/users/${user.id}/progress`,
        );
        if (response.ok) {
          const progressData = await response.json();
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId,
          );
          if (lessonProgress) {
            setProgress({
              lesson_id: lessonProgress.lesson_id,
              videos_watched: lessonProgress.videos_watched || [],
              quizzes_completed: lessonProgress.quizzes_completed || [],
              blooket_completed: lessonProgress.blooket_completed || false,
              origami_completed: lessonProgress.origami_completed || false,
            });
          } else {
            // No progress yet, initialize empty state
            setProgress({
              lesson_id: lessonId,
              videos_watched: [],
              quizzes_completed: [],
              blooket_completed: false,
              origami_completed: false,
            });
          }
        } else {
          // Offline mode - check localStorage
          const offlineProgress = localStorage.getItem(`progress_${user.id}`);
          if (offlineProgress) {
            const progressData = JSON.parse(offlineProgress);
            const lessonProgress = progressData.find(
              (p: any) => p.lesson_id === lessonId,
            );
            if (lessonProgress) {
              setProgress({
                lesson_id: lessonProgress.lesson_id,
                videos_watched: lessonProgress.videos_watched || [],
                quizzes_completed: lessonProgress.quizzes_completed || [],
                blooket_completed: lessonProgress.blooket_completed || false,
                origami_completed: lessonProgress.origami_completed || false,
              });
            } else {
              setProgress({
                lesson_id: lessonId,
                videos_watched: [],
                quizzes_completed: [],
                blooket_completed: false,
                origami_completed: false,
              });
            }
          }
        }
      } catch (error) {
        console.warn("API not available - running in offline mode");
        // Offline mode - check localStorage
        const offlineProgress = localStorage.getItem(`progress_${user.id}`);
        if (offlineProgress) {
          const progressData = JSON.parse(offlineProgress);
          const lessonProgress = progressData.find(
            (p: any) => p.lesson_id === lessonId,
          );
          if (lessonProgress) {
            setProgress({
              lesson_id: lessonProgress.lesson_id,
              videos_watched: lessonProgress.videos_watched || [],
              quizzes_completed: lessonProgress.quizzes_completed || [],
              blooket_completed: lessonProgress.blooket_completed || false,
              origami_completed: lessonProgress.origami_completed || false,
            });
          } else {
            setProgress({
              lesson_id: lessonId,
              videos_watched: [],
              quizzes_completed: [],
              blooket_completed: false,
              origami_completed: false,
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
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [unitId, lessonId, user?.id]);

  // Unified progress update handler
  const updateProgress = async (
    itemType: "video" | "quiz" | "blooket" | "origami",
    itemIndex?: number,
    completed: boolean = true,
  ) => {
    if (!user?.id || !lessonId || !progress) return;

    const itemKey =
      itemIndex !== undefined ? `${itemType}-${itemIndex}` : itemType;
    if (updatingItems.has(itemKey)) return;

    setUpdatingItems((prev) => new Set([...prev, itemKey]));

    // Optimistic update
    const newProgress = { ...progress };
    switch (itemType) {
      case "video":
        if (
          completed &&
          itemIndex !== undefined &&
          !newProgress.videos_watched.includes(itemIndex)
        ) {
          newProgress.videos_watched = [
            ...newProgress.videos_watched,
            itemIndex,
          ];
        } else if (!completed && itemIndex !== undefined) {
          newProgress.videos_watched = newProgress.videos_watched.filter(
            (i) => i !== itemIndex,
          );
        }
        break;
      case "quiz":
        if (
          completed &&
          itemIndex !== undefined &&
          !newProgress.quizzes_completed.includes(itemIndex)
        ) {
          newProgress.quizzes_completed = [
            ...newProgress.quizzes_completed,
            itemIndex,
          ];
        } else if (!completed && itemIndex !== undefined) {
          newProgress.quizzes_completed = newProgress.quizzes_completed.filter(
            (i) => i !== itemIndex,
          );
        }
        break;
      case "blooket":
        newProgress.blooket_completed = completed;
        break;
      case "origami":
        newProgress.origami_completed = completed;
        break;
    }

    setProgress(newProgress);

    // Prepare API payload
    const payload = {
      lesson_id: lessonId,
      item_type: itemType,
      item_index: itemIndex,
      completed,
    };

    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${user.id}/progress/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update progress");
      }

      const result = await response.json();
      console.log("Progress updated successfully:", result);
    } catch (error) {
      console.warn("API not available - saving progress locally");

      // Fallback to localStorage with self-cleaning
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      const progressData = offlineProgress ? JSON.parse(offlineProgress) : [];

      // Self-cleaning: remove lesson_completed from loaded data
      progressData.forEach((p: any) => delete p.lesson_completed);

      const existingIndex = progressData.findIndex(
        (p: any) => p.lesson_id === lessonId,
      );
      if (existingIndex >= 0) {
        Object.assign(progressData[existingIndex], {
          videos_watched: newProgress.videos_watched,
          quizzes_completed: newProgress.quizzes_completed,
          blooket_completed: newProgress.blooket_completed,
          origami_completed: newProgress.origami_completed,
        });
      } else {
        progressData.push({
          lesson_id: lessonId,
          videos_watched: newProgress.videos_watched,
          quizzes_completed: newProgress.quizzes_completed,
          blooket_completed: newProgress.blooket_completed,
          origami_completed: newProgress.origami_completed,
        });
      }

      localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // Individual item handlers (now using unified handler)
  const handleVideoWatched = (videoIndex: number) =>
    updateProgress("video", videoIndex, true);
  const handleQuizCompleted = (quizIndex: number) =>
    updateProgress("quiz", quizIndex, true);
  const handleBlooketCompleted = () =>
    updateProgress("blooket", undefined, !progress?.blooket_completed);
  const handleOrigamiCompleted = () =>
    updateProgress("origami", undefined, !progress?.origami_completed);

  // Handle bookmarking a video
  const handleBookmarkVideo = async (videoIndex: number) => {
    if (!topic || !unit) return;

    await setBookmark({
      lesson_id: lessonId!,
      lesson_title: topic.name,
      unit_id: unitId!,
      bookmark_type: "item",
      item_index: videoIndex,
      item_type: "video",
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
      bookmark_type: "item",
      item_index: quizIndex,
      item_type: "quiz",
      item_title: `${topic.name} - Quiz ${quizIndex + 1}`,
    });
  };

  // AI Grok integration handlers
  const handleCopyPrompt = async (quizIndex: number) => {
    const quiz = topic?.quizzes[quizIndex];
    const promptText = quiz?.aiPrompt ?? DEFAULT_GROK_PROMPT;

    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(`quiz-${quizIndex}`);
      // Clear the feedback after 2 seconds
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (error) {
      console.error("Failed to copy prompt to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = promptText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedPrompt(`quiz-${quizIndex}`);
      setTimeout(() => setCopiedPrompt(null), 2000);
    }
  };

  const handleOpenGrok = () => {
    window.open("https://grok.com", "_blank", "noopener,noreferrer");
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
            <p>
              Could not find lesson {lessonId} in unit {unitId}
            </p>
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
          {progress &&
            topic &&
            (() => {
              const userProgress = {
                videos_watched: progress.videos_watched,
                quizzes_completed: progress.quizzes_completed,
                blooket_completed: progress.blooket_completed,
                origami_completed: progress.origami_completed,
              };
              const fraction = calculateTopicFraction(topic, userProgress);
              const percentage = Math.round(fraction * 100);

              return fraction === 1.0 ? (
                <span className="completion-badge">✅ 100% Complete</span>
              ) : percentage > 0 ? (
                <span className="progress-badge">{percentage}% Complete</span>
              ) : null;
            })()}
        </div>
        <div className="lesson-actions">
          {/* Lesson completion removed - now based purely on fractional progress */}
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
                  const isWatched =
                    progress?.videos_watched.includes(videoIndex) || false;
                  const isUpdating = updatingItems.has(`video-${videoIndex}`);
                  const isBookmarked = isItemBookmarked(
                    lessonId!,
                    "video",
                    videoIndex,
                  );

                  return (
                    <div key={index} className="video-card">
                      <div className="video-header">
                        <h4>Video {index + 1}</h4>
                        <div className="video-header-actions">
                          {isWatched && (
                            <span className="completion-indicator">
                              ✅ Watched
                            </span>
                          )}
                          <button
                            className="bookmark-btn"
                            onClick={() => handleBookmarkVideo(videoIndex)}
                            disabled={isBookmarked}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: "1.2rem",
                              cursor: isBookmarked ? "not-allowed" : "pointer",
                              opacity: isBookmarked ? 0.5 : 1,
                              marginLeft: "0.5rem",
                            }}
                            title={
                              isBookmarked
                                ? "Already bookmarked"
                                : "Bookmark this video"
                            }
                          >
                            {isBookmarked ? "📌" : "📍"}
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
                          className={`item-complete-btn ${isWatched ? "completed" : ""}`}
                          onClick={() => handleVideoWatched(videoIndex)}
                          disabled={isWatched || isUpdating}
                          style={{
                            background: isWatched ? "#28a745" : "#007bff",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "4px",
                            cursor:
                              isWatched || isUpdating
                                ? "not-allowed"
                                : "pointer",
                            fontSize: "0.9rem",
                            marginTop: "0.5rem",
                            width: "100%",
                          }}
                        >
                          {isUpdating
                            ? "Saving..."
                            : isWatched
                              ? "✓ Watched"
                              : "Mark as Watched"}
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
                  const isCompleted =
                    progress?.quizzes_completed.includes(quizIndex) || false;
                  const isUpdating = updatingItems.has(`quiz-${quizIndex}`);
                  const isBookmarked = isItemBookmarked(
                    lessonId!,
                    "quiz",
                    quizIndex,
                  );

                  return (
                    <div key={quiz.quizId} className="quiz-card">
                      <div className="quiz-header">
                        <h4>Quiz {index + 1}</h4>
                        <div className="quiz-header-actions">
                          {isCompleted && (
                            <span className="completion-indicator">
                              ✅ Complete
                            </span>
                          )}
                          <button
                            className="bookmark-btn"
                            onClick={() => handleBookmarkQuiz(quizIndex)}
                            disabled={isBookmarked}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: "1.2rem",
                              cursor: isBookmarked ? "not-allowed" : "pointer",
                              opacity: isBookmarked ? 0.5 : 1,
                              marginLeft: "0.5rem",
                            }}
                            title={
                              isBookmarked
                                ? "Already bookmarked"
                                : "Bookmark this quiz"
                            }
                          >
                            {isBookmarked ? "📌" : "📍"}
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
                      <div className="quiz-ai-actions">
                        <button
                          className="quiz-ai-btn copy-prompt-btn"
                          onClick={() => handleCopyPrompt(quizIndex)}
                          style={{
                            background:
                              copiedPrompt === `quiz-${quizIndex}`
                                ? "#28a745"
                                : "#6f42c1",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            marginRight: "0.5rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title="Copy AI tutor prompt to clipboard"
                        >
                          {copiedPrompt === `quiz-${quizIndex}` ? (
                            <>✓ Copied!</>
                          ) : (
                            <>📋 Copy Grok Prompt</>
                          )}
                        </button>
                        <button
                          className="quiz-ai-btn open-grok-btn"
                          onClick={handleOpenGrok}
                          style={{
                            background: "#1da1f2",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          title="Open Grok.com in a new tab"
                        >
                          🤖 Open Grok
                        </button>
                      </div>
                      <div className="item-actions">
                        <button
                          className={`item-complete-btn ${isCompleted ? "completed" : ""}`}
                          onClick={() => handleQuizCompleted(quizIndex)}
                          disabled={isCompleted || isUpdating}
                          style={{
                            background: isCompleted ? "#28a745" : "#007bff",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1rem",
                            borderRadius: "4px",
                            cursor:
                              isCompleted || isUpdating
                                ? "not-allowed"
                                : "pointer",
                            fontSize: "0.9rem",
                            marginTop: "0.5rem",
                            width: "100%",
                          }}
                        >
                          {isUpdating
                            ? "Saving..."
                            : isCompleted
                              ? "✓ Complete"
                              : "Mark Complete"}
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
                    {progress?.blooket_completed && (
                      <span className="completion-indicator">✅ Complete</span>
                    )}
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
                    className={`item-complete-btn ${progress?.blooket_completed ? "completed" : ""}`}
                    onClick={handleBlooketCompleted}
                    disabled={updatingItems.has("blooket")}
                    style={{
                      background: progress?.blooket_completed
                        ? "#28a745"
                        : "#007bff",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "4px",
                      cursor: updatingItems.has("blooket")
                        ? "not-allowed"
                        : "pointer",
                      fontSize: "0.9rem",
                      marginTop: "0.5rem",
                      width: "100%",
                    }}
                  >
                    {updatingItems.has("blooket")
                      ? "Saving..."
                      : progress?.blooket_completed
                        ? "✓ Done"
                        : "Mark Done"}
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
                    {progress?.origami_completed && (
                      <span className="completion-indicator">✅ Complete</span>
                    )}
                  </div>
                </div>
                <p className="origami-description">
                  {topic.origami.description}
                </p>
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
                    className={`item-complete-btn ${progress?.origami_completed ? "completed" : ""}`}
                    onClick={handleOrigamiCompleted}
                    disabled={updatingItems.has("origami")}
                    style={{
                      background: progress?.origami_completed
                        ? "#28a745"
                        : "#007bff",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "4px",
                      cursor: updatingItems.has("origami")
                        ? "not-allowed"
                        : "pointer",
                      fontSize: "0.9rem",
                      marginTop: "0.5rem",
                      width: "100%",
                    }}
                  >
                    {updatingItems.has("origami")
                      ? "Saving..."
                      : progress?.origami_completed
                        ? "✓ Done"
                        : "Mark Done"}
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
