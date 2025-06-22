// @ts-nocheck
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ALL_UNITS_DATA,
  getTotalItemCounts,
  calculateTotalFractionalLessons,
  calculateTopicFraction,
} from "../data/allUnitsData";
import { PaceTracker } from "../components/PaceTracker";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import type { Unit, Topic } from "../data/allUnitsData";
import styles from "./DashboardPage.module.css";
import { useBlockchain } from "../context/BlockchainProvider";

// Interface for user progress data
interface UserProgress {
  lesson_id: string;
  videos_watched?: number[];
  quizzes_completed?: number[];
  blooket_completed?: boolean;
  origami_completed?: boolean;
  // lesson_completed deprecated - now calculated from fractional progress
  lesson_completed?: boolean;
  completion_date?: string;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { appState } = useBlockchain();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress[]>([]);

  const handleLogout = () => {
    logout();
    // Now navigate using React Router since AuthContext will update the App component
    navigate("/", { replace: true });
  };

  // Recompute user progress whenever blockchain state updates
  useEffect(() => {
    if (!user?.id) return;

    const publicKey = user.id;
    const lessonSet = appState.lessonProgress?.[publicKey];

    if (!lessonSet) {
      setProgress([]);
      return;
    }

    const newProgress: UserProgress[] = Array.from(lessonSet).map((lid) => {
      const topic = ALL_UNITS_DATA.flatMap((u) => u.topics).find((t) => t.id === lid);
      return {
        lesson_id: lid,
        videos_watched: topic ? topic.videos.map((_, idx) => idx) : [],
        quizzes_completed: topic ? topic.quizzes.map((_, idx) => idx) : [],
        blooket_completed: topic ? !!topic.blooket?.url : false,
        origami_completed: topic ? !!topic.origami : false,
        lesson_completed: true,
        completion_date: new Date().toISOString(),
      };
    });

    setProgress(newProgress);
  }, [appState, user?.id]);

  // Helper function to get granular progress for a topic
  const getTopicProgress = (topicId: string) => {
    const topicProgress = progress.find((p) => p.lesson_id === topicId);
    return {
      videosWatched: topicProgress?.videos_watched || [],
      quizzesCompleted: topicProgress?.quizzes_completed || [],
      blooketCompleted: topicProgress?.blooket_completed || false,
      origamiCompleted: topicProgress?.origami_completed || false,
    };
  };

  // Calculate overall progress statistics
  const calculateStats = () => {
    const { totalVideos, totalQuizzes } = getTotalItemCounts(ALL_UNITS_DATA);

    // Phase 1: Use fractional lesson calculation
    const allTopics = ALL_UNITS_DATA.flatMap((unit) => unit.topics);
    const completedLessons = calculateTotalFractionalLessons(
      allTopics,
      progress,
    );

    const totalLessons = ALL_UNITS_DATA.reduce(
      (acc, unit) => acc + unit.topics.length,
      0,
    );

    return {
      completedLessons,
      totalLessons,
      totalVideos,
      totalQuizzes,
      completionPercentage:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
    };
  };

  const stats = calculateStats();

  return (
    <div className={styles.dashboardContainer}>
      {/* Removed redundant local header now provided by PageShell */}

      <main>
        <h1>Welcome, {user?.username || "Explorer"}!</h1>
        <p>Your journey to mastering AP Statistics starts here.</p>
        <section className="dashboard-overview">
          <h2>Your Learning Journey</h2>

          {/* Pace Tracker */}
          <ErrorBoundary componentName="Pace Tracker">
            <PaceTracker
              completedLessons={stats.completedLessons}
              totalLessons={stats.totalLessons}
            />
          </ErrorBoundary>

          {/* Progress Overview */}
          <div className="progress-overview">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${stats.completionPercentage}%` }}
              ></div>
            </div>
            <p>
              {stats.completedLessons.toFixed(2)} of {stats.totalLessons}{" "}
              lessons completed ({stats.completionPercentage.toFixed(2)}%)
            </p>
          </div>

          {/* Units and Lessons */}
          <div className="units-container">
            {ALL_UNITS_DATA.map((unit: Unit) => (
              <UnitAccordion
                key={unit.unitId}
                unit={unit}
                getTopicProgress={getTopicProgress}
              />
            ))}
          </div>
        </section>

        <section className="quick-stats">
          <div className="stat-card">
            <h3>Progress</h3>
            <p>{stats.completionPercentage.toFixed(2)}% Complete</p>
            <small>
              {stats.completedLessons.toFixed(2)}/{stats.totalLessons} lessons
            </small>
          </div>
          <div className="stat-card">
            <h3>Content</h3>
            <p>{stats.totalVideos} Videos</p>
            <small>{stats.totalQuizzes} Quizzes</small>
          </div>
          <div className="stat-card">
            <h3>Next Lesson</h3>
            <p>
              {stats.completedLessons < stats.totalLessons
                ? "Ready to continue!"
                : "All done! 🎉"}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

// Unit Accordion Component
interface UnitAccordionProps {
  unit: Unit;
  getTopicProgress: (topicId: string) => {
    videosWatched: number[];
    quizzesCompleted: number[];
    blooketCompleted: boolean;
    origamiCompleted: boolean;
  };
}

function UnitAccordion({ unit, getTopicProgress }: UnitAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Phase 1: Use fractional progress calculation for more accurate unit progress
  const unitFractionalProgress = unit.topics.reduce((total, topic) => {
    const topicProgress = getTopicProgress(topic.id);
    const userProgress = {
      videos_watched: topicProgress.videosWatched,
      quizzes_completed: topicProgress.quizzesCompleted,
      blooket_completed: topicProgress.blooketCompleted,
      origami_completed: topicProgress.origamiCompleted,
    };
    return total + calculateTopicFraction(topic, userProgress);
  }, 0);

  const totalTopics = unit.topics.length;
  const unitProgress =
    totalTopics > 0
      ? Math.round((unitFractionalProgress / totalTopics) * 100)
      : 0;

  return (
    <div className="unit-accordion">
      <div
        className="unit-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="unit-info">
          <h3>{unit.displayName}</h3>
          <p className="unit-weight">Exam Weight: {unit.examWeight}</p>
          <div className="unit-progress">
            <div className="progress-bar small">
              <div
                className="progress-fill"
                style={{ width: `${unitProgress}%` }}
              ></div>
            </div>
            <span>
              {unitFractionalProgress.toFixed(2)}/{totalTopics} topics
            </span>
          </div>
        </div>
        <div className="expand-icon">{isExpanded ? "−" : "+"}</div>
      </div>

      {isExpanded && (
        <div className="topics-list">
          {unit.topics.map((topic: Topic) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              unitId={unit.unitId}
              progress={getTopicProgress(topic.id)}
              topicData={topic}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Topic Item Component
interface TopicItemProps {
  topic: Topic;
  unitId: string;
  progress: {
    videosWatched: number[];
    quizzesCompleted: number[];
    blooketCompleted: boolean;
    origamiCompleted: boolean;
  };
  topicData: Topic;
}

function TopicItem({ topic, unitId, progress, topicData }: TopicItemProps) {
  const videosCount = topic.videos.length;
  const quizzesCount = topic.quizzes.length;
  const videosWatchedCount = progress.videosWatched.length;
  const quizzesCompletedCount = progress.quizzesCompleted.length;

  // Calculate fractional completion for this topic
  const userProgress = {
    videos_watched: progress.videosWatched,
    quizzes_completed: progress.quizzesCompleted,
    blooket_completed: progress.blooketCompleted,
    origami_completed: progress.origamiCompleted,
  };
  const topicFraction = calculateTopicFraction(topicData, userProgress);
  const completionPercentage = Math.round(topicFraction * 100);
  const isCompleted = topicFraction === 1.0;

  return (
    <div className={`topic-item ${isCompleted ? "completed" : ""}`}>
      <Link to={`/unit/${unitId}/lesson/${topic.id}`} className="topic-link">
        <div className="topic-content">
          <div className="topic-header">
            <h4>{topic.name}</h4>
            <div className="topic-completion">
              {isCompleted ? (
                <span className="completed-checkmark">✅ 100%</span>
              ) : (
                <span
                  className={`completion-percentage ${completionPercentage > 0 ? "in-progress" : ""}`}
                >
                  {completionPercentage}%
                </span>
              )}
            </div>
          </div>
          <p className="topic-description">{topic.description}</p>
          <div className="topic-meta">
            {videosCount > 0 && (
              <span className="content-count">
                📺 {videosWatchedCount}/{videosCount}
              </span>
            )}
            {quizzesCount > 0 && (
              <span className="content-count">
                📝 {quizzesCompletedCount}/{quizzesCount}
              </span>
            )}
            {topic.blooket.url && (
              <span className="content-count">
                🎮 {progress.blooketCompleted ? "✓" : "✗"}
              </span>
            )}
            {topic.origami && (
              <span className="content-count">
                🎨 {progress.origamiCompleted ? "✓" : "✗"}
              </span>
            )}
          </div>
        </div>
        <div className="topic-arrow">→</div>
      </Link>
    </div>
  );
}
