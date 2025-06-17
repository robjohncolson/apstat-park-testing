import React from 'react';
import styles from './SchedulerToggle.module.css';

interface SchedulerToggleProps {
  activeView: 'pace' | 'scheduler';
  onViewChange: (view: 'pace' | 'scheduler') => void;
}

export function SchedulerToggle({ activeView, onViewChange }: SchedulerToggleProps) {
  return (
    <div className={styles.toggleContainer}>
      <h2>📊 Learning Management</h2>
      <div className={styles.toggleButtons}>
        <button
          className={`${styles.toggleButton} ${activeView === 'pace' ? styles.active : ''}`}
          onClick={() => onViewChange('pace')}
        >
          ⏱️ Pace Tracker
        </button>
        <button
          className={`${styles.toggleButton} ${activeView === 'scheduler' ? styles.active : ''}`}
          onClick={() => onViewChange('scheduler')}
        >
          📅 Lesson Scheduler
        </button>
      </div>
      <p className={styles.description}>
        {activeView === 'pace' 
          ? "Track your progress against dynamic soft deadlines"
          : "Customize your learning timeline by dragging lessons"
        }
      </p>
    </div>
  );
} 