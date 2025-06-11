import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ALL_UNITS_DATA, getTotalItemCounts } from '../data/allUnitsData';
import { PaceTracker } from '../components/PaceTracker';
import type { Unit, Topic } from '../data/allUnitsData';
import './DashboardPage.css';

interface UserProgress {
  lesson_id: string;
  videos_watched?: number[];
  quizzes_completed?: number[];
  lesson_completed: boolean;
  completion_date?: string;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const handleLogout = () => {
    logout();
    // Now navigate using React Router since AuthContext will update the App component
    navigate('/', { replace: true });
  };

  // Fetch user progress on component mount
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id) {
        setIsLoadingProgress(false);
        return;
      }
      
      try {
        const response = await fetch(`http://localhost:3001/api/users/${user.id}/progress`);
        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData);
        } else {
          console.warn('Failed to fetch progress - running in offline mode');
          setIsOfflineMode(true);
          // In offline mode, use localStorage for demo purposes
          const offlineProgress = localStorage.getItem(`progress_${user.id}`);
          if (offlineProgress) {
            setProgress(JSON.parse(offlineProgress));
          }
        }
      } catch (error) {
        console.warn('API not available - running in offline mode');
        setIsOfflineMode(true);
        // In offline mode, use localStorage for demo purposes
        const offlineProgress = localStorage.getItem(`progress_${user.id}`);
        if (offlineProgress) {
          setProgress(JSON.parse(offlineProgress));
        }
      } finally {
        setIsLoadingProgress(false);
      }
    };

    fetchProgress();
  }, [user?.id]);

  // Helper function to check if a lesson is completed
  const isLessonCompleted = (topicId: string): boolean => {
    return progress.some(p => p.lesson_id === topicId && p.lesson_completed);
  };

  // Helper function to get granular progress for a topic
  const getTopicProgress = (topicId: string) => {
    const topicProgress = progress.find(p => p.lesson_id === topicId);
    return {
      videosWatched: topicProgress?.videos_watched || [],
      quizzesCompleted: topicProgress?.quizzes_completed || [],
      isCompleted: topicProgress?.lesson_completed || false
    };
  };

  // Calculate overall progress statistics
  const calculateStats = () => {
    const { totalVideos, totalQuizzes } = getTotalItemCounts(ALL_UNITS_DATA);
    const completedLessons = progress.filter(p => p.lesson_completed).length;
    const totalLessons = ALL_UNITS_DATA.reduce((acc, unit) => acc + unit.topics.length, 0);
    
    return {
      completedLessons,
      totalLessons,
      totalVideos,
      totalQuizzes,
      completionPercentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
    };
  };

  const stats = calculateStats();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h1>Welcome, {user?.username || 'Explorer'}!</h1>
          <p>Your journey to mastering AP Statistics starts here.</p>
        </div>
        <div className="header-actions">
          <Link to="/leaderboard" className="leaderboard-link">🏆 Leaderboard</Link>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </header>

      <main>
        <section className="dashboard-overview">
          <h2>Your Learning Journey</h2>
          
          {/* Pace Tracker */}
          <PaceTracker 
            completedLessons={stats.completedLessons}
            totalLessons={stats.totalLessons}
          />
          
          {/* Progress Overview */}
          <div className="progress-overview">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${stats.completionPercentage}%` }}
              ></div>
            </div>
            <p>{stats.completedLessons} of {stats.totalLessons} lessons completed ({stats.completionPercentage}%)</p>
          </div>

          {/* Units and Lessons */}
          <div className="units-container">
            {ALL_UNITS_DATA.map((unit: Unit) => (
              <UnitAccordion 
                key={unit.unitId} 
                unit={unit} 
                isLessonCompleted={isLessonCompleted}
                getTopicProgress={getTopicProgress}
              />
            ))}
          </div>
        </section>

        <section className="quick-stats">
          <div className="stat-card">
            <h3>Progress</h3>
            <p>{stats.completionPercentage}% Complete</p>
            <small>{stats.completedLessons}/{stats.totalLessons} lessons</small>
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
  isLessonCompleted: (topicId: string) => boolean;
  getTopicProgress: (topicId: string) => {
    videosWatched: number[];
    quizzesCompleted: number[];
    isCompleted: boolean;
  };
}

function UnitAccordion({ unit, isLessonCompleted, getTopicProgress }: UnitAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const completedTopics = unit.topics.filter(topic => isLessonCompleted(topic.id)).length;
  const totalTopics = unit.topics.length;
  const unitProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="unit-accordion">
      <div 
        className="unit-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
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
            <span>{completedTopics}/{totalTopics} topics</span>
          </div>
        </div>
        <div className="expand-icon">
          {isExpanded ? '−' : '+'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="topics-list">
          {unit.topics.map((topic: Topic) => (
            <TopicItem 
              key={topic.id}
              topic={topic}
              unitId={unit.unitId}
              progress={getTopicProgress(topic.id)}
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
    isCompleted: boolean;
  };
}

function TopicItem({ topic, unitId, progress }: TopicItemProps) {
  const videosCount = topic.videos.length;
  const quizzesCount = topic.quizzes.length;
  const videosWatchedCount = progress.videosWatched.length;
  const quizzesCompletedCount = progress.quizzesCompleted.length;

  return (
    <div className={`topic-item ${progress.isCompleted ? 'completed' : ''}`}>
      <Link 
        to={`/unit/${unitId}/lesson/${topic.id}`}
        className="topic-link"
      >
        <div className="topic-content">
          <div className="topic-header">
            <h4>{topic.name}</h4>
            {progress.isCompleted && <span className="completed-checkmark">✅</span>}
          </div>
          <p className="topic-description">{topic.description}</p>
          <div className="topic-meta">
            {videosCount > 0 && (
              <span className="content-count">
                📺 {videosWatchedCount}/{videosCount} video{videosCount !== 1 ? 's' : ''}
              </span>
            )}
            {quizzesCount > 0 && (
              <span className="content-count">
                📝 {quizzesCompletedCount}/{quizzesCount} quiz{quizzesCount !== 1 ? 'zes' : ''}
              </span>
            )}
            {topic.origami && <span className="content-count">🎨 Origami</span>}
            {topic.blooket.url && <span className="content-count">🎮 Blooket</span>}
          </div>
        </div>
        <div className="topic-arrow">→</div>
      </Link>
    </div>
  );
} 