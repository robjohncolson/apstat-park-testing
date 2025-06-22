import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBookmark } from "../context/BookmarkContext";
import { useBlockchain } from "../context/BlockchainProvider";
import { findTopicById, findUnitById, calculateTopicFraction, } from "../data/allUnitsData";
import { DEFAULT_GROK_PROMPT } from "../constants/grokPrompt";
import Modal from "../components/Modal/Modal";
import WorkflowExplainer from "../components/WorkflowExplainer/WorkflowExplainer";
import styles from "./LessonPage.module.css";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
export function LessonPage() {
    const { unitId, lessonId } = useParams();
    const { user } = useAuth();
    const { setBookmark, isItemBookmarked } = useBookmark();
    const { submitLessonProgress } = useBlockchain();
    const [topic, setTopic] = useState(null);
    const [unit, setUnit] = useState(null);
    const [progress, setProgress] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingItems, setUpdatingItems] = useState(new Set());
    const [copiedPrompt, setCopiedPrompt] = useState(null);
    // Explainer modal state
    const [isExplainerOpen, setIsExplainerOpen] = useState(false);
    // Load lesson data and progress
    useEffect(() => {
        if (!unitId || !lessonId)
            return;
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
                const response = await fetch(`${apiUrl}/api/users/${user.id}/progress`);
                if (response.ok) {
                    const progressData = await response.json();
                    const lessonProgress = progressData.find((p) => p.lesson_id === lessonId);
                    if (lessonProgress) {
                        setProgress({
                            lesson_id: lessonProgress.lesson_id,
                            videos_watched: lessonProgress.videos_watched || [],
                            quizzes_completed: lessonProgress.quizzes_completed || [],
                            blooket_completed: lessonProgress.blooket_completed || false,
                            origami_completed: lessonProgress.origami_completed || false,
                        });
                    }
                    else {
                        // No progress yet, initialize empty state
                        setProgress({
                            lesson_id: lessonId,
                            videos_watched: [],
                            quizzes_completed: [],
                            blooket_completed: false,
                            origami_completed: false,
                        });
                    }
                }
                else {
                    // Offline mode - check localStorage
                    const offlineProgress = localStorage.getItem(`progress_${user.id}`);
                    if (offlineProgress) {
                        const progressData = JSON.parse(offlineProgress);
                        const lessonProgress = progressData.find((p) => p.lesson_id === lessonId);
                        if (lessonProgress) {
                            setProgress({
                                lesson_id: lessonProgress.lesson_id,
                                videos_watched: lessonProgress.videos_watched || [],
                                quizzes_completed: lessonProgress.quizzes_completed || [],
                                blooket_completed: lessonProgress.blooket_completed || false,
                                origami_completed: lessonProgress.origami_completed || false,
                            });
                        }
                        else {
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
            }
            catch {
                console.warn("API not available - running in offline mode");
                // Offline mode - check localStorage
                const offlineProgress = localStorage.getItem(`progress_${user.id}`);
                if (offlineProgress) {
                    const progressData = JSON.parse(offlineProgress);
                    const lessonProgress = progressData.find((p) => p.lesson_id === lessonId);
                    if (lessonProgress) {
                        setProgress({
                            lesson_id: lessonProgress.lesson_id,
                            videos_watched: lessonProgress.videos_watched || [],
                            quizzes_completed: lessonProgress.quizzes_completed || [],
                            blooket_completed: lessonProgress.blooket_completed || false,
                            origami_completed: lessonProgress.origami_completed || false,
                        });
                    }
                    else {
                        setProgress({
                            lesson_id: lessonId,
                            videos_watched: [],
                            quizzes_completed: [],
                            blooket_completed: false,
                            origami_completed: false,
                        });
                    }
                }
                else {
                    // No offline data, initialize empty
                    setProgress({
                        lesson_id: lessonId,
                        videos_watched: [],
                        quizzes_completed: [],
                        blooket_completed: false,
                        origami_completed: false,
                    });
                }
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchProgress();
    }, [unitId, lessonId, user?.id]);
    // Unified progress update handler
    const updateProgress = async (itemType, itemIndex, completed = true) => {
        if (!user?.id || !lessonId || !progress)
            return;
        const itemKey = itemIndex !== undefined ? `${itemType}-${itemIndex}` : itemType;
        if (updatingItems.has(itemKey))
            return;
        setUpdatingItems((prev) => new Set([...prev, itemKey]));
        // Optimistic update
        const newProgress = { ...progress };
        switch (itemType) {
            case "video":
                if (completed &&
                    itemIndex !== undefined &&
                    !newProgress.videos_watched.includes(itemIndex)) {
                    newProgress.videos_watched = [
                        ...newProgress.videos_watched,
                        itemIndex,
                    ];
                }
                else if (!completed && itemIndex !== undefined) {
                    newProgress.videos_watched = newProgress.videos_watched.filter((i) => i !== itemIndex);
                }
                break;
            case "quiz":
                if (completed &&
                    itemIndex !== undefined &&
                    !newProgress.quizzes_completed.includes(itemIndex)) {
                    newProgress.quizzes_completed = [
                        ...newProgress.quizzes_completed,
                        itemIndex,
                    ];
                }
                else if (!completed && itemIndex !== undefined) {
                    newProgress.quizzes_completed = newProgress.quizzes_completed.filter((i) => i !== itemIndex);
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
                lessonId: lessonId,
                progressType: itemType === "video"
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
            };
            // Fire and forget – any errors are logged but do not disrupt UX
            submitLessonProgress(chainPayload).catch((err) => console.error("Failed to submit lesson progress to blockchain", err));
        }
        catch (err) {
            console.error("submitLessonProgress failed", err);
        }
        try {
            const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/users/${user.id}/progress/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error("Failed to update progress");
            }
            const result = await response.json();
            console.log("Progress updated successfully:", result);
        }
        catch {
            console.warn("API not available - saving progress locally");
            // Fallback to localStorage with self-cleaning
            const offlineProgress = localStorage.getItem(`progress_${user.id}`);
            const progressData = offlineProgress ? JSON.parse(offlineProgress) : [];
            // Self-cleaning: remove lesson_completed from loaded data
            progressData.forEach((p) => delete p.lesson_completed);
            const existingIndex = progressData.findIndex((p) => p.lesson_id === lessonId);
            if (existingIndex >= 0) {
                Object.assign(progressData[existingIndex], {
                    videos_watched: newProgress.videos_watched,
                    quizzes_completed: newProgress.quizzes_completed,
                    blooket_completed: newProgress.blooket_completed,
                    origami_completed: newProgress.origami_completed,
                });
            }
            else {
                progressData.push({
                    lesson_id: lessonId,
                    videos_watched: newProgress.videos_watched,
                    quizzes_completed: newProgress.quizzes_completed,
                    blooket_completed: newProgress.blooket_completed,
                    origami_completed: newProgress.origami_completed,
                });
            }
            localStorage.setItem(`progress_${user.id}`, JSON.stringify(progressData));
        }
        finally {
            setUpdatingItems((prev) => {
                const next = new Set(prev);
                next.delete(itemKey);
                return next;
            });
        }
    };
    // Individual item handlers (now using unified handler)
    const handleVideoWatched = (videoIndex) => updateProgress("video", videoIndex, true);
    const handleQuizCompleted = (quizIndex) => updateProgress("quiz", quizIndex, true);
    const handleBlooketCompleted = () => updateProgress("blooket", undefined, !progress?.blooket_completed);
    const handleOrigamiCompleted = () => updateProgress("origami", undefined, !progress?.origami_completed);
    // Handle bookmarking a video
    const handleBookmarkVideo = async (videoIndex) => {
        if (!topic || !unit)
            return;
        await setBookmark({
            lesson_id: lessonId,
            lesson_title: topic.name,
            unit_id: unitId,
            bookmark_type: "item",
            item_index: videoIndex,
            item_type: "video",
            item_title: `${topic.name} - Video ${videoIndex + 1}`,
        });
    };
    // Handle bookmarking a quiz
    const handleBookmarkQuiz = async (quizIndex) => {
        if (!topic || !unit)
            return;
        await setBookmark({
            lesson_id: lessonId,
            lesson_title: topic.name,
            unit_id: unitId,
            bookmark_type: "item",
            item_index: quizIndex,
            item_type: "quiz",
            item_title: `${topic.name} - Quiz ${quizIndex + 1}`,
        });
    };
    // AI Grok integration handlers
    const handleCopyPrompt = async (quizIndex) => {
        const quiz = topic?.quizzes[quizIndex];
        const promptText = quiz?.aiPrompt ?? DEFAULT_GROK_PROMPT;
        try {
            await navigator.clipboard.writeText(promptText);
            setCopiedPrompt(`quiz-${quizIndex}`);
            // Clear the feedback after 2 seconds
            setTimeout(() => setCopiedPrompt(null), 2000);
        }
        catch {
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
        return (_jsx("div", { className: styles.lessonPage, children: _jsx(Spinner, { children: "Loading lesson..." }) }));
    }
    if (!topic || !unit) {
        return (_jsx("div", { className: styles.lessonPage, children: _jsxs("header", { className: styles.lessonHeader, children: [_jsx(Link, { to: "/dashboard", className: styles.backLink, children: "\u2190 Back to Dashboard" }), _jsxs("div", { className: styles.lessonInfo, children: [_jsx("h1", { children: "Lesson Not Found" }), _jsxs("p", { children: ["Could not find lesson ", lessonId, " in unit ", unitId] })] })] }) }));
    }
    return (_jsxs("div", { className: styles.lessonPage, children: [_jsxs("header", { className: styles.lessonHeader, children: [_jsx(Link, { to: "/dashboard", className: styles.backLink, children: "\u2190 Back to Dashboard" }), _jsxs("div", { className: styles.lessonInfo, children: [_jsx("h1", { children: topic.name }), _jsx("p", { children: unit.displayName }), progress &&
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
                                    return fraction === 1.0 ? (_jsx(Badge, { variant: "success", children: "\u2705 100% Complete" })) : percentage > 0 ? (_jsxs(Badge, { variant: "info", children: [percentage, "% Complete"] })) : null;
                                })()] }), _jsx("div", { className: styles.lessonActions })] }), _jsx("main", { className: styles.lessonMain, children: _jsxs("div", { className: styles.lessonContent, children: [_jsx("section", { className: styles.lessonDescription, children: _jsx("h2", { children: topic.description }) }), topic.videos.length > 0 && (_jsxs("section", { className: styles.contentSection, children: [_jsx("h3", { children: "\uD83D\uDCFA Videos" }), _jsx("div", { className: styles.videosGrid, children: topic.videos.map((video, index) => {
                                        const videoIndex = video.index ?? index;
                                        const isWatched = progress?.videos_watched.includes(videoIndex) || false;
                                        const isUpdating = updatingItems.has(`video-${videoIndex}`);
                                        const isBookmarked = isItemBookmarked(lessonId, "video", videoIndex);
                                        return (_jsxs(Card, { className: styles.videoCard, children: [_jsxs("div", { className: styles.videoHeader, children: [_jsxs("h4", { children: ["Video ", index + 1] }), _jsxs("div", { className: styles.videoHeaderActions, children: [isWatched && (_jsx("span", { className: styles.completionIndicator, children: "\u2705 Watched" })), _jsx("button", { className: styles.bookmarkBtn, onClick: () => handleBookmarkVideo(videoIndex), disabled: isBookmarked, title: isBookmarked
                                                                        ? "Already bookmarked"
                                                                        : "Bookmark this video", children: isBookmarked ? "📌" : "📍" })] })] }), _jsxs("div", { className: styles.videoLinks, children: [_jsx(Button, { href: video.url, target: "_blank", rel: "noopener noreferrer", variant: "primary", children: "Watch on AP Classroom" }), video.altUrl && (_jsx(Button, { href: video.altUrl, target: "_blank", rel: "noopener noreferrer", variant: "secondary", children: "Alternative Link" }))] }), _jsx("div", { className: styles.itemActions, children: _jsx(Button, { onClick: () => handleVideoWatched(videoIndex), disabled: isWatched || isUpdating, variant: "primary", className: isWatched ? styles.completed : "", children: isUpdating
                                                            ? "Saving..."
                                                            : isWatched
                                                                ? "✓ Watched"
                                                                : "Mark as Watched" }) })] }, index));
                                    }) })] })), topic.quizzes.length > 0 && (_jsxs("section", { className: styles.contentSection, children: [_jsx("h3", { children: "\uD83D\uDCDD Quizzes" }), _jsx("div", { className: styles.quizzesGrid, children: topic.quizzes.map((quiz, index) => {
                                        const quizIndex = quiz.index ?? index;
                                        const isCompleted = progress?.quizzes_completed.includes(quizIndex) || false;
                                        const isUpdating = updatingItems.has(`quiz-${quizIndex}`);
                                        const isBookmarked = isItemBookmarked(lessonId, "quiz", quizIndex);
                                        return (_jsxs(Card, { className: styles.quizCard, children: [_jsxs("div", { className: styles.quizHeader, children: [_jsxs("h4", { children: ["Quiz ", index + 1] }), _jsxs("div", { className: styles.quizHeaderActions, children: [isCompleted && (_jsx("span", { className: styles.completionIndicator, children: "\u2705 Complete" })), _jsx("button", { className: styles.bookmarkBtn, onClick: () => handleBookmarkQuiz(quizIndex), disabled: isBookmarked, title: isBookmarked
                                                                        ? "Already bookmarked"
                                                                        : "Bookmark this quiz", children: isBookmarked ? "📌" : "📍" })] })] }), _jsxs("div", { className: styles.quizLinks, children: [quiz.questionPdf && (_jsx(Button, { href: quiz.questionPdf, target: "_blank", rel: "noopener noreferrer", variant: "secondary", children: "\uD83D\uDCC4 Questions" })), _jsx(Button, { href: quiz.answersPdf, target: "_blank", rel: "noopener noreferrer", variant: "secondary", children: "\uD83D\uDCC4 Answers" })] }), _jsxs("div", { className: styles.quizAiActions, children: [_jsx("button", { className: `${styles.quizAiBtnCopyPromptBtn} ${copiedPrompt === `quiz-${quizIndex}` ? styles.copied : ""}`, onClick: () => handleCopyPrompt(quizIndex), title: "Copy AI tutor prompt to clipboard", children: copiedPrompt === `quiz-${quizIndex}` ? (_jsx(_Fragment, { children: "\u2713 Copied!" })) : (_jsx(_Fragment, { children: "\uD83D\uDCCB Copy Grok Prompt" })) }), _jsx("button", { className: styles.quizAiBtnOpenGrokBtn, onClick: handleOpenGrok, title: "Open Grok.com in a new tab", children: "\uD83E\uDD16 Open Grok" }), _jsx("button", { "aria-label": "How to use the AI Quiz Tutor", onClick: () => setIsExplainerOpen(true), title: "How to use the AI Quiz Tutor", className: styles.quizAiHelpBtn, children: "?" })] }), _jsx("div", { className: styles.itemActions, children: _jsx(Button, { onClick: () => handleQuizCompleted(quizIndex), disabled: isCompleted || isUpdating, variant: "primary", className: isCompleted ? styles.completed : "", children: isUpdating
                                                            ? "Saving..."
                                                            : isCompleted
                                                                ? "✓ Complete"
                                                                : "Mark Complete" }) })] }, quiz.quizId));
                                    }) })] })), topic.blooket.url && (_jsxs("section", { className: styles.contentSection, children: [_jsx("h3", { children: "\uD83C\uDFAE Blooket Game" }), _jsxs(Card, { className: styles.blooketCard, children: [_jsxs("div", { className: styles.blooketHeader, children: [_jsx("h4", { children: "Interactive Review Game" }), _jsx("div", { className: styles.blooketHeaderActions, children: progress?.blooket_completed && (_jsx("span", { className: styles.completionIndicator, children: "\u2705 Complete" })) })] }), _jsx("p", { children: "Test your knowledge with this interactive game!" }), _jsx("div", { className: styles.blooketLinks, children: _jsx(Button, { href: topic.blooket.url, target: "_blank", rel: "noopener noreferrer", variant: "secondary", children: "Play Blooket Game" }) }), _jsx("div", { className: styles.itemActions, children: _jsx(Button, { onClick: handleBlooketCompleted, disabled: updatingItems.has("blooket"), variant: "primary", className: progress?.blooket_completed ? styles.completed : "", children: updatingItems.has("blooket")
                                                    ? "Saving..."
                                                    : progress?.blooket_completed
                                                        ? "✓ Done"
                                                        : "Mark Done" }) })] })] })), topic.origami && (_jsxs("section", { className: styles.contentSection, children: [_jsx("h3", { children: "\uD83C\uDFA8 Origami Activity" }), _jsxs(Card, { className: styles.origamiCard, children: [_jsxs("div", { className: styles.origamiHeader, children: [_jsx("h4", { children: topic.origami.name }), _jsx("div", { className: styles.origamiHeaderActions, children: progress?.origami_completed && (_jsx("span", { className: styles.completionIndicator, children: "\u2705 Complete" })) })] }), _jsx("p", { className: styles.origamiDescription, children: topic.origami.description }), _jsx("div", { className: styles.origamiLinks, children: _jsx(Button, { href: topic.origami.videoUrl, target: "_blank", rel: "noopener noreferrer", variant: "secondary", children: "Watch Origami Tutorial" }) }), _jsxs("div", { className: styles.reflection, children: [_jsx("h5", { children: "\uD83D\uDCAD Reflection" }), _jsx("p", { children: topic.origami.reflection })] }), _jsx("div", { className: styles.itemActions, children: _jsx(Button, { onClick: handleOrigamiCompleted, disabled: updatingItems.has("origami"), variant: "primary", className: progress?.origami_completed ? styles.completed : "", children: updatingItems.has("origami")
                                                    ? "Saving..."
                                                    : progress?.origami_completed
                                                        ? "✓ Done"
                                                        : "Mark Done" }) })] })] }))] }) }), _jsx(Modal, { isOpen: isExplainerOpen, onRequestClose: () => setIsExplainerOpen(false), contentLabel: "AI Quiz Tutor Workflow Guide", children: _jsx(WorkflowExplainer, {}) })] }));
}
