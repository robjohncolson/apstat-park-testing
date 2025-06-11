// allUnitsData.ts

// TypeScript interfaces for the curriculum data structure

export interface Video {
  url: string;
  altUrl?: string;
  completed: boolean;
  completionDate: string | null;
  /** Unique index within its lesson */
  index?: number;
}

export interface Quiz {
  questionPdf?: string;
  answersPdf: string;
  quizId: string;
  completed: boolean;
  completionDate: string | null;
  /** Unique index within its lesson */
  index?: number;
}

export interface Blooket {
  url: string;
  completed: boolean;
  completionDate: string | null;
  index?: number;
}

export interface Origami {
  name: string;
  description: string;
  videoUrl: string;
  reflection: string;
  index?: number;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  videos: Video[];
  blooket: Blooket;
  origami: Origami;
  quizzes: Quiz[];
  current: boolean;
  isCapstone?: boolean;
  index?: number;
}

export interface Unit {
  unitId: string;
  displayName: string;
  examWeight: string;
  topics: Topic[];
}

// The main data export
export const ALL_UNITS_DATA: Unit[] = [
  {
    unitId: 'unit1',
    displayName: "Unit 1: Exploring One-Variable Data",
    examWeight: "15-23%",
    topics: [
      {
        id: "1-1",
        name: "Topic 1.1",
        description: "Introducing Statistics: What Can We Learn from Data?",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/708w9bpk60?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1wEbNmDM4KBUWvvoRoQIgIYKYWxG3x6Cv/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847bb74fe947147cb3c05de",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Paper Airplane (Classic Dart)",
            description: "Perfect starter - turn your notes into flight!",
            videoUrl: "https://www.youtube.com/watch?v=veyZNyurlwU",
            reflection: "As your paper airplane soars, think about how data can help us explore and understand our world, just like this lesson introduced you to statistics.",
        },
        quizzes: [],
        current: false,
    },
    {
        id: "1-2",
        name: "Topic 1.2",
        description: "The Language of Variation: Variables",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/o7atnjt521?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1cJ3a5DSlZ0w3vta901HVyADfQ-qKVQcD/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 1
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847beef46fe0cb8b31e937f",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Simple Boat",
            description: "Navigate the waters of variables with your paper boat",
            videoUrl: "https://www.youtube.com/watch?v=vNba3jbBSOw",
            reflection: "Like variables that take different values, your boat can sail different paths. Reflect on how data varies and what that tells us.",
        },
        quizzes: [
            {
                questionPdf: "pdfs/unit1/unit1_section1.2_quiz.pdf",
                answersPdf: "pdfs/unit1/unit1_section1.2_answers.pdf",
                quizId: "1-2_q1",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        current: false,
    },
    {
        id: "1-3",
        name: "Topic 1.3",
        description: "Representing a Categorical Variable with Tables",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/5umo3jmlhy?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1F9_jLryrjHyXUN21eZmNHrTIGATBhhDw/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 2
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847c1aa46fe0cb8b31e93b4",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Paper Hat",
            description: "Crown yourself with categorical thinking",
            videoUrl: "https://www.youtube.com/watch?v=2FHjUT8At0Y",
            reflection: "Just as your hat sits in the category 'headwear,' think about how we organize data into meaningful categories and tables.",
        },
        quizzes: [
            {
                questionPdf: "pdfs/unit1/unit1_section1.3_quiz.pdf",
                answersPdf: "pdfs/unit1/unit1_section1.3_answers.pdf",
                quizId: "1-3_q1",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        current: false,
    },
    {
        id: "1-4",
        name: "Topic 1.4",
        description: "Representing a Categorical Variable with Graphs",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/nnomwwtzqc?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1vo3zsZu4wZAAkf-fPTuCmKXudgs0Gnl4/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 3
            },
            {
                url: "https://apclassroom.collegeboard.org/d/yd2t974opr?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1Hp7GWdTzjPQNvcAnnrrt_QYXV27gCEHh/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 4
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847c3b146fe0cb8b31e93d9",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Fortune Teller (Cootie Catcher)",
            description: "Interactive origami for graphical exploration",
            videoUrl: "https://www.youtube.com/watch?v=FlX35Tg-lDk",
            reflection: "As you play with your fortune teller, think about how graphs help us visualize and interact with categorical data patterns.",
        },
        quizzes: [
            {
                questionPdf: "pdfs/unit1/unit1_section1.4_quiz.pdf",
                answersPdf: "pdfs/unit1/unit1_section1.4_answers.pdf",
                quizId: "1-4_q1",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        current: false,
    },
    {
        id: "1-5",
        name: "Topic 1.5",
        description: "Representing a Quantitative Variable with Graphs",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/o142s0yu7e?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1jlopxNducZRaqXtU9c2NvXxq_tGK90ue/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 5
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847c89646fe0cb8b31e9430",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Paper Cup",
            description: "A practical fold for holding quantitative insights",
            videoUrl: "https://www.youtube.com/watch?v=2FHjUT8At0Y",
            reflection: "Your paper cup can hold water just as graphs hold data points. Consider how different graph types can contain and display quantitative information in meaningful ways.",
        },
        quizzes: [
            {
                questionPdf: "pdfs/unit1/unit1_section1.5_quiz.pdf",
                answersPdf: "pdfs/unit1/unit1_section1.5_answers.pdf",
                quizId: "1-5_q1",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        current: false,
    },
    {
        id: "1-6",
        name: "Topic 1.6",
        description: "Describing the Distribution of a Quantitative Variable",
        videos: [
            {
                url: "https://apclassroom.collegeboard.org/d/q0wwgrkzqb?sui=33,1",
                altUrl: "https://drive.google.com/file/d/1oWGqzk4meQ6HuXE-mTDHMStp-qOGDUZJ/view?usp=drive_link",
                completed: false,
                completionDate: null,
                index: 6
            }
        ],
        blooket: {
            url: "https://dashboard.blooket.com/set/6847c9c646fe0cb8b31e9442",
            completed: false,
            completionDate: null,
        },
        origami: {
            name: "Simple Flower (Tulip)",
            description: "Beauty blooms in data distributions",
            videoUrl: "https://www.youtube.com/watch?v=QPKBF-D1wNk",
            reflection: "Like a tulip that shows the beautiful distribution of petals, data distributions reveal the elegant patterns hidden within numbers.",
        },
        quizzes: [
            {
                questionPdf: "pdfs/unit1/unit1_section1.6_quiz.pdf",
                answersPdf: "pdfs/unit1/unit1_section1.6_answers.pdf",
                quizId: "1-6_q1",
                completed: false,
                completionDate: null,
                index: 0
            }
        ],
        current: false,
    }
    // Note: This is a sample with just Unit 1, Topic 1.1-1.6
    // The full data from the original file would include all 9 units
    ]
  }
];

// Helper function to calculate totals (utility function from original file)
export function getTotalItemCounts(allUnitsDataArray: Unit[] = ALL_UNITS_DATA): { totalVideos: number; totalQuizzes: number } {
    let totalVideos = 0;
    let totalQuizzes = 0;

    if (!allUnitsDataArray || !Array.isArray(allUnitsDataArray)) {
        console.error("Invalid data provided to getTotalItemCounts in allUnitsData.ts");
        return { totalVideos: 0, totalQuizzes: 0 };
    }

    allUnitsDataArray.forEach(unit => {
        if (unit.topics && Array.isArray(unit.topics)) {
            unit.topics.forEach(topic => {
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
export function findUnitById(unitId: string, data: Unit[] = ALL_UNITS_DATA): Unit | undefined {
    return data.find(unit => unit.unitId === unitId);
}

export function findTopicById(unitId: string, topicId: string, data: Unit[] = ALL_UNITS_DATA): Topic | undefined {
    const unit = findUnitById(unitId, data);
    return unit?.topics.find(topic => topic.id === topicId);
}

export function getAllTopics(data: Unit[] = ALL_UNITS_DATA): Topic[] {
    return data.flatMap(unit => unit.topics);
}

// -------------------------------
// Utility: Ensure every video and quiz has a unique index within its lesson
// -------------------------------
function initializeIndexes(): void {
  ALL_UNITS_DATA.forEach((unit) => {
    unit.topics.forEach((topic) => {
      topic.videos.forEach((video, idx) => {
        if (video.index === undefined) {
          (video as Video).index = idx;
        }
      });
      topic.quizzes.forEach((quiz, idx) => {
        if (quiz.index === undefined) {
          (quiz as Quiz).index = idx;
        }
      });
    });
  });
}

// Execute at module load
initializeIndexes(); 