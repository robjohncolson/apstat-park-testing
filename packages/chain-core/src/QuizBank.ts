/**
 * Quiz Bank - Proof of Knowledge Puzzle Source
 * 
 * This file contains the hardcoded data source of questions and answers 
 * that serve as the "mining" puzzles for our protocol.
 */

export interface QuizQuestion {
  questionId: string; // e.g., '1-1_q1'
  lessonId: string;   // e.g., '1-1'
  questionText: string;
  answers: [string, string, string, string]; // An array of exactly 4 possible answers
  correctAnswerIndex: 0 | 1 | 2 | 3;
}

export const QUIZ_BANK: QuizQuestion[] = [
  // Unit 1, Lesson 1 - Introduction to Statistics
  {
    questionId: '1-1_q1',
    lessonId: '1-1',
    questionText: 'What is the definition of a categorical variable?',
    answers: [
      'A variable that takes numerical values.',
      'A variable that places an individual into one of several groups or categories.',
      'A variable that describes a characteristic of a population.',
      'A variable that is used to predict another variable.'
    ],
    correctAnswerIndex: 1
  },
  {
    questionId: '1-1_q2',
    lessonId: '1-1',
    questionText: 'Which of the following is an example of a quantitative variable?',
    answers: [
      'Eye color',
      'Gender',
      'Height in centimeters',
      'Favorite pizza topping'
    ],
    correctAnswerIndex: 2
  },
  {
    questionId: '1-1_q3',
    lessonId: '1-1',
    questionText: 'What is the difference between a population and a sample?',
    answers: [
      'A population is smaller than a sample',
      'A sample is the entire group of interest, while a population is a subset',
      'A population is the entire group of interest, while a sample is a subset',
      'There is no difference between a population and a sample'
    ],
    correctAnswerIndex: 2
  },

  // Unit 1, Lesson 2 - Data Collection Methods
  {
    questionId: '1-2_q1',
    lessonId: '1-2',
    questionText: 'What is the main advantage of a simple random sample?',
    answers: [
      'It is the cheapest sampling method',
      'It eliminates all bias',
      'It gives each individual in the population an equal chance of being selected',
      'It always produces the most accurate results'
    ],
    correctAnswerIndex: 2
  },
  {
    questionId: '1-2_q2',
    lessonId: '1-2',
    questionText: 'Which type of study can establish cause and effect relationships?',
    answers: [
      'Observational study',
      'Survey',
      'Experiment',
      'Census'
    ],
    correctAnswerIndex: 2
  },

  // Unit 2, Lesson 1 - Displaying Categorical Data
  {
    questionId: '2-1_q1',
    lessonId: '2-1',
    questionText: 'Which graph is most appropriate for displaying the distribution of a single categorical variable?',
    answers: [
      'Histogram',
      'Bar chart',
      'Scatterplot',
      'Box plot'
    ],
    correctAnswerIndex: 1
  },
  {
    questionId: '2-1_q2',
    lessonId: '2-1',
    questionText: 'In a relative frequency bar chart, what do the heights of the bars represent?',
    answers: [
      'The actual count in each category',
      'The proportion or percentage in each category',
      'The cumulative frequency',
      'The mean of each category'
    ],
    correctAnswerIndex: 1
  },

  // Unit 2, Lesson 2 - Displaying Quantitative Data  
  {
    questionId: '2-2_q1',
    lessonId: '2-2',
    questionText: 'What is the main difference between a histogram and a bar chart?',
    answers: [
      'Histograms are for quantitative data, bar charts are for categorical data',
      'Histograms are always vertical, bar charts can be horizontal',
      'There is no difference',
      'Histograms show percentages, bar charts show counts'
    ],
    correctAnswerIndex: 0
  },

  // Unit 3, Lesson 1 - Describing Location in a Distribution
  {
    questionId: '3-1_q1',
    lessonId: '3-1',
    questionText: 'Which measure of center is most resistant to outliers?',
    answers: [
      'Mean',
      'Median',
      'Mode',
      'Range'
    ],
    correctAnswerIndex: 1
  },
  {
    questionId: '3-1_q2',
    lessonId: '3-1',
    questionText: 'If a student scores at the 75th percentile on a test, this means:',
    answers: [
      'The student got 75% of the questions correct',
      'The student scored better than 75% of all students who took the test',
      'The student scored worse than 75% of all students who took the test',
      'The student\'s score was 75 points'
    ],
    correctAnswerIndex: 1
  }
]; 