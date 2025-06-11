import { useParams, Link } from 'react-router-dom';

export function LessonPage() {
  const { unitId, lessonId } = useParams<{ unitId: string; lessonId: string }>();

  return (
    <div className="lesson-page">
      <header className="lesson-header">
        <Link to="/dashboard" className="back-link">
          ← Back to Dashboard
        </Link>
        <div className="lesson-info">
          <h1>Lesson {lessonId}</h1>
          <p>Unit {unitId}</p>
        </div>
      </header>

      <main className="lesson-main">
        <div className="coming-soon">
          <h2>🎯 Lesson Content Coming Soon!</h2>
          <p>This lesson viewer will contain:</p>
          <ul>
            <li>📺 Video content with progress tracking</li>
            <li>📄 PDF resources and notes</li>
            <li>✅ Interactive exercises and quizzes</li>
            <li>🔖 Bookmark functionality</li>
            <li>📊 Real-time progress sync</li>
          </ul>
        </div>
      </main>
    </div>
  );
} 