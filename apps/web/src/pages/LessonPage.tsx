import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBookmark } from "../context/BookmarkContext";
import { useBlockchain } from "../context/BlockchainProvider";
import {
  findTopicById,
  findUnitById,
  calculateTopicFraction,
} from "../data/allUnitsData";
import type { Topic, Unit } from "../data/allUnitsData";
import { DEFAULT_GROK_PROMPT } from "../constants/grokPrompt";
import Modal from "../components/Modal/Modal";
import WorkflowExplainer from "../components/WorkflowExplainer/WorkflowExplainer";
import styles from "./LessonPage.module.css";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";

// Interface for granular progress tracking
interface LessonProgress {
  lesson_id: string;
  videos_watched: number[];
  quizzes_completed: number[];
  blooket_completed?: boolean;
  origami_completed?: boolean;
  // lesson_completed removed - now calculated from fractional progress
}

// Interface for API progress data
interface ProgressData {
  lesson_id: string;
  videos_watched?: number[];
  quizzes_completed?: number[];
  blooket_completed?: boolean;
  origami_completed?: boolean;
}

export function LessonPage() {
  const { unitId, lessonId } = useParams<{
    unitId: string;
    lessonId: string;
  }>();
  const { user } = useAuth();
  const { setBookmark, isItemBookmarked } = useBookmark();
  const { submitLessonProgress } = useBlockchain();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  // Explainer modal state
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

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
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/progress`,
        );
        if (response.ok) {
          const progressData = await response.json();
          const lessonProgress = (progressData as ProgressData[]).find(
            (p) => p.lesson_id === lessonId,
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
            const progressData = JSON.parse(offlineProgress) as ProgressData[];
            const lessonProgress = progressData.find(
              (p) => p.lesson_id === lessonId,
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
      } catch {
        console.warn("API not available - running in offline mode");
        // Offline mode - check localStorage
        const offlineProgress = localStorage.getItem(`progress_${user.id}`);
        if (offlineProgress) {
          const progressData = JSON.parse(offlineProgress) as ProgressData[];
          const lessonProgress = progressData.find(
            (p) => p.lesson_id === lessonId,
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

    // Prepare API payload (existing backend)
    const payload = {
      lesson_id: lessonId,
      item_type: itemType,
      item_index: itemIndex,
      completed,
    };

    // ------------------------------------------------------------------
    // Broadcast progress to blockchain – converted to on-chain schema
    // ------------------------------------------------------------------
    try {
      const chainPayload = {
        lessonId: lessonId!,
        progressType:
          itemType === "video"
            ? "video_watched"
            : itemType === "quiz"
              ? "quiz_completed"
              : "lesson_completed",
        itemId: itemIndex !== undefined ? String(itemIndex) : undefined,
        status: completed ? (itemType === "video" ? "watched" : "completed") : "in_progress",
        metadata: {
          // Pass through original payload for additional context
          item_type: itemType,
          item_index: itemIndex,
          completed,
        },
      } as const;

      // Fire and forget – any errors are logged but do not disrupt UX
      submitLessonProgress(chainPayload as any).catch((err) =>
        console.error("Failed to submit lesson progress to blockchain", err),
      );
    } catch (err) {
      console.error("submitLessonProgress failed", err);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/api/users/${user.id}/progress/update`,
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
    } catch {
      console.warn("API not available - saving progress locally");

      // Fallback to localStorage with self-cleaning
      const offlineProgress = localStorage.getItem(`progress_${user.id}`);
      const progressData: ProgressData[] = offlineProgress ? JSON.parse(offlineProgress) : [];

      // Self-cleaning: remove lesson_completed from loaded data
      progressData.forEach((p) => delete (p as unknown as Record<string, unknown>).lesson_completed);

      const existingIndex = progressData.findIndex(
        (p) => p.lesson_id === lessonId,
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
    } catch {
      console.error("Failed to copy prompt to clipboard:");
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
      <div className={styles.lessonPage}>
        <Spinner>Loading lesson...</Spinner>
      </div>
    );
  }

  if (!topic || !unit) {
    return (
      <div className={styles.lessonPage}>
        <header className={styles.lessonHeader}>
          <Link to="/dashboard" className={styles.backLink}>
            ← Back to Dashboard
          </Link>
          <div className={styles.lessonInfo}>
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
    <div className={styles.lessonPage}>
      <header className={styles.lessonHeader}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to Dashboard
        </Link>
        <div className={styles.lessonInfo}>
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
                <Badge variant="success">✅ 100% Complete</Badge>
              ) : percentage > 0 ? (
                <Badge variant="info">{percentage}% Complete</Badge>
              ) : null;
            })()}
        </div>
        <div className={styles.lessonActions}>
          {/* Lesson completion removed - now based purely on fractional progress */}
        </div>
      </header>

      <main className={styles.lessonMain}>
        <div className={styles.lessonContent}>
          <section className={styles.lessonDescription}>
            <h2>{topic.description}</h2>
          </section>

          {/* Videos Section */}
          {topic.videos.length > 0 && (
            <section className={styles.contentSection}>
              <h3>📺 Videos</h3>
              <div className={styles.videosGrid}>
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
                    <Card key={index} className={styles.videoCard}>
                      <div className={styles.videoHeader}>
                        <h4>Video {index + 1}</h4>
                        <div className={styles.videoHeaderActions}>
                          {isWatched && (
                            <span className={styles.completionIndicator}>
                              ✅ Watched
                            </span>
                          )}
                          <button
                            className={styles.bookmarkBtn}
                            onClick={() => handleBookmarkVideo(videoIndex)}
                            disabled={isBookmarked}
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
                      <div className={styles.videoLinks}>
                        <Button
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="primary"
                        >
                          Watch on AP Classroom
                        </Button>
                        {video.altUrl && (
                          <Button
                            href={video.altUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                          >
                            Alternative Link
                          </Button>
                        )}
                      </div>
                      <div className={styles.itemActions}>
                        <Button
                          onClick={() => handleVideoWatched(videoIndex)}
                          disabled={isWatched || isUpdating}
                          variant="primary"
                          className={isWatched ? styles.completed : ""}
                        >
                          {isUpdating
                            ? "Saving..."
                            : isWatched
                              ? "✓ Watched"
                              : "Mark as Watched"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quizzes Section */}
          {topic.quizzes.length > 0 && (
            <section className={styles.contentSection}>
              <h3>📝 Quizzes</h3>
              <div className={styles.quizzesGrid}>
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
                    <Card key={quiz.quizId} className={styles.quizCard}>
                      <div className={styles.quizHeader}>
                        <h4>Quiz {index + 1}</h4>
                        <div className={styles.quizHeaderActions}>
                          {isCompleted && (
                            <span className={styles.completionIndicator}>
                              ✅ Complete
                            </span>
                          )}
                          <button
                            className={styles.bookmarkBtn}
                            onClick={() => handleBookmarkQuiz(quizIndex)}
                            disabled={isBookmarked}
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
                      <div className={styles.quizLinks}>
                        {quiz.questionPdf && (
                          <Button
                            href={quiz.questionPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="secondary"
                          >
                            📄 Questions
                          </Button>
                        )}
                        <Button
                          href={quiz.answersPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="secondary"
                        >
                          📄 Answers
                        </Button>
                      </div>
                      <div className={styles.quizAiActions}>
                        <button
                          className={`${styles.quizAiBtnCopyPromptBtn} ${copiedPrompt === `quiz-${quizIndex}` ? styles.copied : ""}`}
                          onClick={() => handleCopyPrompt(quizIndex)}
                          title="Copy AI tutor prompt to clipboard"
                        >
                          {copiedPrompt === `quiz-${quizIndex}` ? (
                            <>✓ Copied!</>
                          ) : (
                            <>📋 Copy Grok Prompt</>
                          )}
                        </button>
                        <button
                          className={styles.quizAiBtnOpenGrokBtn}
                          onClick={handleOpenGrok}
                          title="Open Grok.com in a new tab"
                        >
                          🤖 Open Grok
                        </button>
                        <button
                          aria-label="How to use the AI Quiz Tutor"
                          onClick={() => setIsExplainerOpen(true)}
                          title="How to use the AI Quiz Tutor"
                          className={styles.quizAiHelpBtn}
                        >
                          ?
                        </button>
                      </div>
                      <div className={styles.itemActions}>
                        <Button
                          onClick={() => handleQuizCompleted(quizIndex)}
                          disabled={isCompleted || isUpdating}
                          variant="primary"
                          className={isCompleted ? styles.completed : ""}
                        >
                          {isUpdating
                            ? "Saving..."
                            : isCompleted
                              ? "✓ Complete"
                              : "Mark Complete"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Blooket Section */}
          {topic.blooket.url && (
            <section className={styles.contentSection}>
              <h3>🎮 Blooket Game</h3>
              <Card className={styles.blooketCard}>
                <div className={styles.blooketHeader}>
                  <h4>Interactive Review Game</h4>
                  <div className={styles.blooketHeaderActions}>
                    {progress?.blooket_completed && (
                      <span className={styles.completionIndicator}>✅ Complete</span>
                    )}
                  </div>
                </div>
                <p>Test your knowledge with this interactive game!</p>
                <div className={styles.blooketLinks}>
                  <Button
                    href={topic.blooket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                  >
                    Play Blooket Game
                  </Button>
                </div>
                <div className={styles.itemActions}>
                  <Button
                    onClick={handleBlooketCompleted}
                    disabled={updatingItems.has("blooket")}
                    variant="primary"
                    className={progress?.blooket_completed ? styles.completed : ""}
                  >
                    {updatingItems.has("blooket")
                      ? "Saving..."
                      : progress?.blooket_completed
                        ? "✓ Done"
                        : "Mark Done"}
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {/* Origami Section */}
          {topic.origami && (
            <section className={styles.contentSection}>
              <h3>🎨 Origami Activity</h3>
              <Card className={styles.origamiCard}>
                <div className={styles.origamiHeader}>
                  <h4>{topic.origami.name}</h4>
                  <div className={styles.origamiHeaderActions}>
                    {progress?.origami_completed && (
                      <span className={styles.completionIndicator}>✅ Complete</span>
                    )}
                  </div>
                </div>
                <p className={styles.origamiDescription}>
                  {topic.origami.description}
                </p>
                <div className={styles.origamiLinks}>
                  <Button
                    href={topic.origami.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary"
                  >
                    Watch Origami Tutorial
                  </Button>
                </div>
                <div className={styles.reflection}>
                  <h5>💭 Reflection</h5>
                  <p>{topic.origami.reflection}</p>
                </div>
                <div className={styles.itemActions}>
                  <Button
                    onClick={handleOrigamiCompleted}
                    disabled={updatingItems.has("origami")}
                    variant="primary"
                    className={progress?.origami_completed ? styles.completed : ""}
                  >
                    {updatingItems.has("origami")
                      ? "Saving..."
                      : progress?.origami_completed
                        ? "✓ Done"
                        : "Mark Done"}
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </div>
      </main>

      {/* AI Quiz Tutor Workflow Explainer Modal */}
      <Modal
        isOpen={isExplainerOpen}
        onRequestClose={() => setIsExplainerOpen(false)}
        contentLabel="AI Quiz Tutor Workflow Guide"
      >
        <WorkflowExplainer />
      </Modal>
    </div>
  );
}
