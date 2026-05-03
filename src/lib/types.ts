export interface Vocab { word: string; meaning: string; example: string; }

export interface Question {
  type: string;
  question: string;
  tip: string;
  sample: string;
  vocabulary: Vocab[];
  keyPoints: string[];
}

export interface TextScore {
  score: number;
  estimatedLevel: string;
  strengths: string[];
  improvements: string[];
  overall: string;
}

export interface CriterionScore { score: number; feedback: string; }

export interface VoiceScore {
  overallScore: number;
  estimatedLevel: string;
  criteria: {
    functions:        CriterionScore;
    textType:         CriterionScore;
    content:          CriterionScore;
    comprehensibility:CriterionScore;
    languageControl:  CriterionScore;
  };
  strengths:       string[];
  improvements:    string[];
  pronunciationNote: string;
  overall:         string;
}

export interface Fav {
  id:           string;
  questionText: string;
  sample:       string;
  topicName:    string;
  level:        string;
  type:         string;
  savedAt:      string;
}

export interface SurveyAnswers {
  [questionId: string]: number | number[];
}
