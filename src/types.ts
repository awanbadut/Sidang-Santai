/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PanelistId } from "./components/PanelistAvatar";

export enum SimulationType {
  SIDANG = 'sidang',
  INTERVIEW = 'interview',
  MEETING_SIDANG = 'meeting_sidang',
  MEETING_INTERVIEW = 'meeting_interview',
}

export enum SimulationStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export interface StarFeedback {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface QuestionEntry {
  question: string;
  answer: string;
  feedback: string;
  score: number;
  suggestedAnswer: string;
  panelistId: PanelistId;
  starFeedback?: StarFeedback;
}

export interface Simulation {
  id?: string;
  userId: string;
  type: SimulationType;
  title: string;
  createdAt: any; // Firestore Timestamp
  documentText: string;
  jobDescription?: string;
  questions: QuestionEntry[];
  finalScore?: number;
  improvementTips?: string;
  hiringLikelihood?: number;
  status: SimulationStatus;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
}
