import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_UNITS_DATA, getAllTopics } from '../../data/allUnitsData';
import type { Topic } from '../../data/allUnitsData';
import styles from './LessonScheduler.module.css';

// Default instructor deadlines from the user's provided schedule
const INSTRUCTOR_DEADLINES = new Map([
  ['1-1', new Date('2025-09-05')],
  ['1-2', new Date('2025-09-05')],
  ['1-3', new Date('2025-09-05')],
  ['1-4', new Date('2025-09-12')],
  ['1-5', new Date('2025-09-12')],
  ['1-6', new Date('2025-09-12')],
  ['1-7', new Date('2025-09-12')],
  ['1-8', new Date('2025-09-19')],
  ['1-9', new Date('2025-09-19')],
  ['1-10', new Date('2025-09-19')],
  ['1-capstone', new Date('2025-09-19')],
  ['2-1', new Date('2025-09-26')],
  ['2-2', new Date('2025-09-26')],
  ['2-3', new Date('2025-09-26')],
  ['2-4', new Date('2025-09-26')],
  ['2-5', new Date('2025-10-03')],
  ['2-6', new Date('2025-10-03')],
  ['2-7', new Date('2025-10-03')],
  ['2-8', new Date('2025-10-10')],
  ['2-9', new Date('2025-10-10')],
  ['2-capstone', new Date('2025-10-10')],
  ['3-1', new Date('2025-10-10')],
  ['3-2', new Date('2025-10-17')],
  ['3-3', new Date('2025-10-17')],
  ['3-4', new Date('2025-10-17')],
  ['3-5', new Date('2025-10-24')],
  ['3-6', new Date('2025-10-24')],
  ['3-7', new Date('2025-10-24')],
  ['3-capstone', new Date('2025-10-31')],
  ['4-1', new Date('2025-10-31')],
  ['4-2', new Date('2025-10-31')],
  ['4-3', new Date('2025-11-07')],
  ['4-4', new Date('2025-11-07')],
  ['4-5', new Date('2025-11-07')],
  ['4-6', new Date('2025-11-14')],
  ['4-7', new Date('2025-11-14')],
  ['4-8', new Date('2025-11-21')],
  ['4-9', new Date('2025-11-21')],
  ['4-10', new Date('2025-11-26')],
  ['4-11', new Date('2025-12-05')],
  ['4-12', new Date('2025-12-05')],
  ['4-capstone', new Date('2025-12-12')],
  ['5-1', new Date('2025-12-12')],
  ['5-2', new Date('2025-12-12')],
  ['5-3', new Date('2025-12-19')],
  ['5-4', new Date('2025-12-19')],
  ['5-5', new Date('2026-01-09')],
  ['5-6', new Date('2026-01-09')],
  ['5-7', new Date('2026-01-16')],
  ['5-8', new Date('2026-01-16')],
  ['5-capstone', new Date('2026-01-16')],
  ['6-1', new Date('2026-01-23')],
  ['6-2', new Date('2026-01-23')],
  ['6-3', new Date('2026-01-23')],
  ['6-4', new Date('2026-01-30')],
  ['6-5', new Date('2026-01-30')],
  ['6-6', new Date('2026-01-30')],
  ['6-7', new Date('2026-02-06')],
  ['6-8', new Date('2026-02-06')],
  ['6-9', new Date('2026-02-06')],
  ['6-10', new Date('2026-02-13')],
  ['6-11', new Date('2026-02-13')],
  ['6-capstone', new Date('2026-02-13')],
  ['7-1', new Date('2026-02-27')],
  ['7-2', new Date('2026-02-27')],
  ['7-3', new Date('2026-02-27')],
  ['7-4', new Date('2026-03-06')],
  ['7-5', new Date('2026-03-06')],
  ['7-6', new Date('2026-03-06')],
  ['7-7', new Date('2026-03-13')],
  ['7-8', new Date('2026-03-13')],
  ['7-9', new Date('2026-03-13')],
  ['7-10', new Date('2026-03-20')],
  ['7-capstone', new Date('2026-03-20')],
  ['8-1', new Date('2026-03-20')],
  ['8-2', new Date('2026-03-27')],
  ['8-3', new Date('2026-03-27')],
  ['8-4', new Date('2026-03-27')],
  ['8-5', new Date('2026-04-03')],
  ['8-6', new Date('2026-04-03')],
  ['8-7', new Date('2026-04-08')],
  ['8-capstone', new Date('2026-04-08')],
  ['9-1', new Date('2026-04-08')],
  ['9-2', new Date('2026-04-08')],
  ['9-3', new Date('2026-04-08')],
  ['9-4', new Date('2026-04-08')],
  ['9-5', new Date('2026-04-08')],
  ['9-6', new Date('2026-04-08')],
  ['9-capstone', new Date('2026-04-08')],
]);

const AP_EXAM_DATE = new Date('2026-05-07');
const SCHOOL_START_DATE = new Date('2025-08-25');

interface LessonScheduleItem {
  topic: Topic;
  unitId: string;
  instructorDeadline: Date;
  userDeadline?: Date;
  isCompleted: boolean;
  completionDate?: Date;
}

interface LessonSchedulerProps {
  completedLessons: string[];
  userProgress: Array<{
    lesson_id: string;
    videos_watched?: number[];
    quizzes_completed?: number[];
    blooket_completed?: boolean;
    origami_completed?: boolean;
    completion_date?: string;
  }>;
  onScheduleChange?: (schedule: Map<string, Date>) => void;
}

export function LessonScheduler({ 
  completedLessons, 
  userProgress, 
  onScheduleChange 
}: LessonSchedulerProps) {
  const [scheduleItems, setScheduleItems] = useState<LessonScheduleItem[]>([]);
  const [userSchedule, setUserSchedule] = useState<Map<string, Date>>(new Map());
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<string | null>(null);

  // Initialize schedule items
  useEffect(() => {
    const allTopics = getAllTopics(ALL_UNITS_DATA);
    const items: LessonScheduleItem[] = [];

    ALL_UNITS_DATA.forEach(unit => {
      unit.topics.forEach(topic => {
        const instructorDeadline = INSTRUCTOR_DEADLINES.get(topic.id) || AP_EXAM_DATE;
        const isCompleted = completedLessons.includes(topic.id);
        const progressData = userProgress.find(p => p.lesson_id === topic.id);
        const completionDate = progressData?.completion_date ? new Date(progressData.completion_date) : undefined;

        items.push({
          topic,
          unitId: unit.unitId,
          instructorDeadline,
          userDeadline: userSchedule.get(topic.id),
          isCompleted,
          completionDate
        });
      });
    });

    setScheduleItems(items);
  }, [completedLessons, userProgress, userSchedule]);

  // Load user schedule from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('apstat-user-schedule');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const scheduleMap = new Map<string, Date>();
        Object.entries(parsed).forEach(([lessonId, dateStr]) => {
          scheduleMap.set(lessonId, new Date(dateStr as string));
        });
        setUserSchedule(scheduleMap);
      } catch (error) {
        console.warn('Failed to load user schedule from localStorage:', error);
      }
    }
  }, []);

  // Save user schedule to localStorage
  const saveSchedule = useCallback((schedule: Map<string, Date>) => {
    const serializable = Object.fromEntries(
      Array.from(schedule.entries()).map(([key, date]) => [key, date.toISOString()])
    );
    localStorage.setItem('apstat-user-schedule', JSON.stringify(serializable));
    onScheduleChange?.(schedule);
  }, [onScheduleChange]);

  // Reset to instructor defaults
  const resetToDefaults = useCallback(() => {
    const defaultSchedule = new Map<string, Date>();
    INSTRUCTOR_DEADLINES.forEach((date, lessonId) => {
      defaultSchedule.set(lessonId, new Date(date));
    });
    setUserSchedule(defaultSchedule);
    saveSchedule(defaultSchedule);
  }, [saveSchedule]);

  // Handle lesson deadline change
  const updateLessonDeadline = useCallback((lessonId: string, newDeadline: Date) => {
    const newSchedule = new Map(userSchedule);
    newSchedule.set(lessonId, newDeadline);
    setUserSchedule(newSchedule);
    saveSchedule(newSchedule);
  }, [userSchedule, saveSchedule]);

  // Calculate timeline dimensions
  const timelineDimensions = useMemo(() => {
    const totalDays = Math.ceil((AP_EXAM_DATE.getTime() - SCHOOL_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
    const width = Math.max(1200, totalDays * 3); // 3px per day minimum
    return { totalDays, width };
  }, []);

  // Convert date to x-position on timeline
  const dateToX = useCallback((date: Date) => {
    const daysSinceStart = (date.getTime() - SCHOOL_START_DATE.getTime()) / (1000 * 60 * 60 * 24);
    return (daysSinceStart / timelineDimensions.totalDays) * timelineDimensions.width;
  }, [timelineDimensions]);

  // Convert x-position to date
  const xToDate = useCallback((x: number) => {
    const proportion = x / timelineDimensions.width;
    const daysSinceStart = proportion * timelineDimensions.totalDays;
    return new Date(SCHOOL_START_DATE.getTime() + daysSinceStart * 24 * 60 * 60 * 1000);
  }, [timelineDimensions]);

  // Handle drag start
  const handleDragStart = useCallback((lessonId: string) => {
    setDraggedLesson(lessonId);
  }, []);

  // Handle drag over timeline
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop on timeline
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedLesson) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newDate = xToDate(x);

    // Ensure the new date is within bounds
    if (newDate >= SCHOOL_START_DATE && newDate <= AP_EXAM_DATE) {
      updateLessonDeadline(draggedLesson, newDate);
    }

    setDraggedLesson(null);
  }, [draggedLesson, xToDate, updateLessonDeadline]);

  // Get unit color
  const getUnitColor = useCallback((unitId: string) => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
      '#8B5CF6', '#F97316', '#06B6D4', '#84CC16', '#EC4899'
    ];
    const unitIndex = parseInt(unitId.replace('unit', '')) - 1;
    return colors[unitIndex % colors.length];
  }, []);

  return (
    <div className={styles.lessonScheduler}>
      <div className={styles.header}>
        <h2>📅 Lesson Scheduler</h2>
        <p>Drag lessons to customize your learning timeline</p>
        
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button 
              className={viewMode === 'timeline' ? styles.active : ''}
              onClick={() => setViewMode('timeline')}
            >
              📊 Timeline
            </button>
            <button 
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
            >
              📝 List
            </button>
          </div>
          
          <button className={styles.resetButton} onClick={resetToDefaults}>
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {viewMode === 'timeline' && (
        <div className={styles.timelineContainer}>
          <div className={styles.timelineHeader}>
            <div className={styles.legend}>
              {ALL_UNITS_DATA.map(unit => (
                <div key={unit.unitId} className={styles.legendItem}>
                  <div 
                    className={styles.legendColor}
                    style={{ backgroundColor: getUnitColor(unit.unitId) }}
                  />
                  <span>{unit.displayName.replace('Unit ', 'U')}</span>
                </div>
              ))}
            </div>
          </div>

          <div 
            className={styles.timeline}
            style={{ width: timelineDimensions.width }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Timeline axis */}
            <div className={styles.timelineAxis}>
              {/* Month markers */}
              {Array.from({ length: 10 }, (_, i) => {
                const date = new Date(2025, 7 + i, 1); // Aug 2025 - May 2026
                const x = dateToX(date);
                return (
                  <div 
                    key={i}
                    className={styles.monthMarker}
                    style={{ left: x }}
                  >
                    <div className={styles.monthLine} />
                    <div className={styles.monthLabel}>
                      {date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              
              {/* AP Exam marker */}
              <div 
                className={styles.examMarker}
                style={{ left: dateToX(AP_EXAM_DATE) }}
              >
                <div className={styles.examLine} />
                <div className={styles.examLabel}>🎯 AP Exam</div>
              </div>
            </div>

            {/* Lesson pins */}
            <div className={styles.lessonPins}>
              {scheduleItems.map((item, index) => {
                const deadline = item.userDeadline || item.instructorDeadline;
                const x = dateToX(deadline);
                const unitColor = getUnitColor(item.unitId);
                
                return (
                  <div
                    key={item.topic.id}
                    className={`${styles.lessonPin} ${item.isCompleted ? styles.completed : ''} ${selectedLesson === item.topic.id ? styles.selected : ''}`}
                    style={{ 
                      left: x,
                      backgroundColor: unitColor,
                      zIndex: selectedLesson === item.topic.id ? 1000 : 100 + index
                    }}
                    draggable
                    onDragStart={() => handleDragStart(item.topic.id)}
                    onClick={() => setSelectedLesson(selectedLesson === item.topic.id ? null : item.topic.id)}
                    title={`${item.topic.name}: ${deadline.toLocaleDateString()}`}
                  >
                    <div className={styles.pinIcon}>
                      {item.isCompleted ? '✅' : item.topic.isCapstone ? '🏆' : '📚'}
                    </div>
                    <div className={styles.pinLabel}>
                      {item.topic.id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className={styles.listView}>
          <div className={styles.listHeader}>
            <div>Lesson</div>
            <div>Instructor Deadline</div>
            <div>Your Deadline</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          
          {scheduleItems.map(item => (
            <div key={item.topic.id} className={styles.listItem}>
              <div className={styles.lessonInfo}>
                <span className={styles.lessonId}>{item.topic.id}</span>
                <span className={styles.lessonName}>{item.topic.name}</span>
              </div>
              
              <div className={styles.instructorDeadline}>
                {item.instructorDeadline.toLocaleDateString()}
              </div>
              
              <div className={styles.userDeadline}>
                <input
                  type="date"
                  value={(item.userDeadline || item.instructorDeadline).toISOString().split('T')[0]}
                  onChange={(e) => updateLessonDeadline(item.topic.id, new Date(e.target.value))}
                  min={SCHOOL_START_DATE.toISOString().split('T')[0]}
                  max={AP_EXAM_DATE.toISOString().split('T')[0]}
                />
              </div>
              
              <div className={styles.status}>
                {item.isCompleted ? (
                  <span className={styles.completedBadge}>✅ Complete</span>
                ) : (
                  <span className={styles.pendingBadge}>⏳ Pending</span>
                )}
              </div>
              
              <div className={styles.actions}>
                <button
                  onClick={() => updateLessonDeadline(item.topic.id, item.instructorDeadline)}
                  title="Reset to instructor deadline"
                >
                  🔄
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLesson && (
        <div className={styles.lessonDetails}>
          {(() => {
            const item = scheduleItems.find(s => s.topic.id === selectedLesson);
            if (!item) return null;
            
            return (
              <div className={styles.detailsCard}>
                <h3>{item.topic.name}</h3>
                <p>{item.topic.description}</p>
                <div className={styles.detailsInfo}>
                  <div>
                    <strong>Instructor Deadline:</strong> {item.instructorDeadline.toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Your Deadline:</strong> {(item.userDeadline || item.instructorDeadline).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Content:</strong> {item.topic.videos.length} videos, {item.topic.quizzes.length} quizzes
                  </div>
                  {item.isCompleted && item.completionDate && (
                    <div>
                      <strong>Completed:</strong> {item.completionDate.toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button 
                  className={styles.closeDetails}
                  onClick={() => setSelectedLesson(null)}
                >
                  ×
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
} 