// allUnitsData.ts
// Import the full curriculum data from the legacy JavaScript module
// NOTE: relative path from apps/web/src/data -> ../../../web-legacy/js/allUnitsData.js
// @ts-expect-error - Legacy JS module, will be properly typed in Phase 6
import { ALL_UNITS_DATA as LEGACY_UNITS_DATA } from "../../../web-legacy/js/allUnitsData.js";
// Re-export the full legacy data so the rest of the application can keep the same import path.
// Cast to Unit[] to satisfy TypeScript, since the legacy file is plain JS.
export const ALL_UNITS_DATA = LEGACY_UNITS_DATA;
// -------------------------------
// Normalization: ensure every quiz PDF path is absolute (starts with "/")
// -------------------------------
ALL_UNITS_DATA.forEach((unit) => {
    unit.topics.forEach((topic) => {
        topic.quizzes.forEach((quiz) => {
            if (quiz.questionPdf && !quiz.questionPdf.startsWith("/")) {
                quiz.questionPdf = "/" + quiz.questionPdf.replace(/^\/+/, "");
            }
            if (quiz.answersPdf && !quiz.answersPdf.startsWith("/")) {
                quiz.answersPdf = "/" + quiz.answersPdf.replace(/^\/+/, "");
            }
        });
    });
});
// Helper function to calculate totals (utility function from original file)
export function getTotalItemCounts(allUnitsDataArray = ALL_UNITS_DATA) {
    let totalVideos = 0;
    let totalQuizzes = 0;
    if (!allUnitsDataArray || !Array.isArray(allUnitsDataArray)) {
        console.error("Invalid data provided to getTotalItemCounts in allUnitsData.ts");
        return { totalVideos: 0, totalQuizzes: 0 };
    }
    allUnitsDataArray.forEach((unit) => {
        if (unit.topics && Array.isArray(unit.topics)) {
            unit.topics.forEach((topic) => {
                // Count videos
                if (topic.videos && Array.isArray(topic.videos)) {
                    totalVideos += topic.videos.length;
                }
                // Count quizzes
                if (topic.quizzes && Array.isArray(topic.quizzes)) {
                    totalQuizzes += topic.quizzes.length;
                }
            });
        }
    });
    console.log(`getTotalItemCounts calculated: ${totalVideos} videos, ${totalQuizzes} quizzes`);
    return { totalVideos, totalQuizzes };
}
// Additional helper functions for finding specific data
export function findUnitById(unitId, data = ALL_UNITS_DATA) {
    return data.find((unit) => unit.unitId === unitId);
}
export function findTopicById(unitId, topicId, data = ALL_UNITS_DATA) {
    const unit = findUnitById(unitId, data);
    return unit?.topics.find((topic) => topic.id === topicId);
}
export function getAllTopics(data = ALL_UNITS_DATA) {
    return data.flatMap((unit) => unit.topics);
}
// -------------------------------
// Utility: Ensure every video and quiz has a unique index within its lesson
// -------------------------------
function initializeIndexes() {
    ALL_UNITS_DATA.forEach((unit) => {
        unit.topics.forEach((topic) => {
            topic.videos.forEach((video, idx) => {
                if (video.index === undefined) {
                    video.index = idx;
                }
            });
            topic.quizzes.forEach((quiz, idx) => {
                if (quiz.index === undefined) {
                    quiz.index = idx;
                }
            });
        });
    });
}
// Execute at module load
initializeIndexes();
// -------------------------------
// Phase 1: Fractional Progress Calculation
// Based on sub-item weights: video=0.4, quiz=0.4, blooket=0.1, origami=0.1
// -------------------------------
/**
 * Calculate fractional completion for a topic based on completed sub-items
 * Uses dynamic weight calculation based on content present in the lesson
 * @param topic The topic to calculate completion for
 * @param userProgress User's progress data for this topic
 * @returns Fraction from 0.0 to 1.0
 */
export function calculateTopicFraction(topic, userProgress) {
    if (!userProgress)
        return 0.0;
    // Baseline fixed weights for Blooket and Origami
    const baselineWeights = {
        blooket: 0.15,
        origami: 0.05,
    };
    // Calculate dynamic weights based on lesson content
    const hasVideos = topic.videos?.length > 0;
    const hasQuizzes = topic.quizzes?.length > 0;
    const hasBlooket = topic.blooket?.url;
    const hasOrigami = topic.origami;
    // Calculate actual weights based on what content is present
    const blooketWeight = hasBlooket ? baselineWeights.blooket : 0;
    const origamiWeight = hasOrigami ? baselineWeights.origami : 0;
    const quizWeight = hasQuizzes ? 0.45 : 0;
    // Remaining weight goes to videos (distributed among all videos in lesson)
    const videoWeight = 1.0 - (blooketWeight + origamiWeight + quizWeight);
    // Validation: ensure all weights are non-negative and sum to 1.0
    if (videoWeight < 0) {
        throw new Error(`Dynamic weight calculation error: video weight would be negative (${videoWeight})`);
    }
    const totalWeight = videoWeight + quizWeight + blooketWeight + origamiWeight;
    if (Math.abs(totalWeight - 1.0) > 0.001) {
        throw new Error(`Dynamic weights must sum to 1.0, but sum to ${totalWeight}`);
    }
    let fraction = 0.0;
    // Videos - distribute video weight evenly among all videos
    if (hasVideos) {
        const videosWatched = userProgress.videos_watched?.length || 0;
        const totalVideos = topic.videos.length;
        fraction += (videosWatched / totalVideos) * videoWeight;
    }
    // Quizzes - distribute quiz weight evenly among all quizzes
    if (hasQuizzes) {
        const quizzesCompleted = userProgress.quizzes_completed?.length || 0;
        const totalQuizzes = topic.quizzes.length;
        fraction += (quizzesCompleted / totalQuizzes) * quizWeight;
    }
    // Blooket (binary - all or nothing)
    if (hasBlooket && userProgress.blooket_completed) {
        fraction += blooketWeight;
    }
    // Origami (binary - all or nothing)
    if (hasOrigami && userProgress.origami_completed) {
        fraction += origamiWeight;
    }
    // Cap at 1.0 and ensure non-negative
    return Math.min(1.0, Math.max(0.0, fraction));
}
/**
 * Calculate total fractional lessons completed across all topics
 * @param allTopics All curriculum topics
 * @param userProgressArray User's progress for all topics
 * @returns Total fractional lessons (e.g., 23.7 lessons)
 */
export function calculateTotalFractionalLessons(allTopics, userProgressArray) {
    return allTopics.reduce((total, topic) => {
        const userProgressData = userProgressArray.find((p) => p.lesson_id === topic.id);
        if (!userProgressData)
            return total;
        // Use the new data structure directly
        const userProgress = {
            videos_watched: userProgressData.videos_watched || [],
            quizzes_completed: userProgressData.quizzes_completed || [],
            blooket_completed: userProgressData.blooket_completed || false,
            origami_completed: userProgressData.origami_completed || false,
        };
        const fraction = calculateTopicFraction(topic, userProgress);
        return total + fraction;
    }, 0.0);
}
