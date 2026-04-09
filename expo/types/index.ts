export type UserRole = 'parent' | 'teacher' | 'therapist' | 'caregiver';

export type MoodRating = 'good' | 'mixed' | 'challenging';

export type DailyMoodRating = 'great' | 'mixed' | 'challenging';

export type MoodTag = 'happy' | 'calm' | 'anxious' | 'sad' | 'angry' | 'frustrated' | 'excited' | 'tired' | 'overwhelmed' | 'content' | 'focused' | 'social' | 'sensory';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  diagnosis?: string;
  gradeLevel?: string;
  schoolName?: string;
  height?: string;
  weight?: string;
  commonTriggers: string[];
  strengths?: string[];
  interests?: string[];
  avatar?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  caregiverName?: string;
  caregiverEmail?: string;
  caregiverPhone?: string;
  therapistPhone?: string;
  children: ChildProfile[];
  activeChildId: string | null;
  createdAt: string;
  isExploreMode?: boolean;
}

export type MeltdownMood = 'angry' | 'crying' | 'scared' | 'neutral';
export type MeltdownTrigger = 'loud_noise' | 'routine_change' | 'sensory_overload' | 'hunger' | 'social_stress' | 'unknown';
export type MeltdownSeverity = 'mild' | 'moderate' | 'severe';

export interface DailyLogEntry {
  id: string;
  childId: string;
  date: string;
  type: 'daily';
  overallRating: DailyMoodRating;
  whatWentWell?: string;
  whatWasChallenging?: string;
  moodTags: MoodTag[];
  sleepHours?: number;
  photo?: string;
  additionalNotes?: string;
  createdAt: string;
}

export interface MeltdownLogEntry {
  id: string;
  childId: string;
  date: string;
  type: 'meltdown';
  moodAtEvent: MeltdownMood;
  triggers: MeltdownTrigger[];
  severity: MeltdownSeverity;
  durationMinutes: number;
  additionalNotes?: string;
  photo?: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  childId: string;
  date: string;
  moodRating: MoodRating;
  positiveNotes?: string;
  challengeNotes?: string;
  moodTags: MoodTag[];
  type: 'daily' | 'enhanced' | 'meltdown';
  behaviors?: string[];
  sleepHours?: number;
  triggers?: string[];
  voiceNotes?: string;
  photos?: string[];
  createdAt: string;
}

export type AnyLogEntry = DailyLogEntry | MeltdownLogEntry | LogEntry;

export type ReminderCategory = 'mood' | 'behavior' | 'sleep' | 'food' | 'therapy' | 'other';
export type ReminderTone = 'chime' | 'silent' | 'text';
export type ReminderRepeat = 'daily' | 'weekdays' | 'custom';

export interface CustomReminder {
  id: string;
  label: string;
  category?: ReminderCategory;
  time: string;
  repeat: ReminderRepeat;
  customDays?: number[];
  tone: ReminderTone;
  message: string;
  enabled: boolean;
}

export interface QuickReminder {
  id: string;
  type: 'morning' | 'afternoon' | 'evening' | 'sleep';
  enabled: boolean;
  time?: string;
}

export interface Preferences {
  theme: 'light' | 'dark' | 'auto';
  colorTheme: 'mint' | 'lavender' | 'peach';
  fontSize: 'small' | 'medium' | 'large';
  textToSpeech: boolean;
  reminders: boolean;
  reminderTime?: string;
  quickReminders?: QuickReminder[];
  customReminders?: CustomReminder[];
}

export type TherapistRole = 'ABA' | 'OT' | 'Psychologist' | 'SLP' | 'Behavioral Therapist' | 'Other';
export type SharedAccessStatus = 'pending' | 'accepted' | 'declined';

export interface TherapistPermissions {
  canViewLogs: boolean;
  canViewProgress: boolean;
  canViewProfile: boolean;
  canAddNotes: boolean;
  canAddSessions: boolean;
  canComment: boolean;
  canExport: boolean;
  readonlyMode: boolean;
}

export interface SharedAccess extends TherapistPermissions {
  id: string;
  childId: string;
  parentId: string;
  therapistId?: string;
  therapistName: string;
  therapistEmail: string;
  therapistRole: TherapistRole;
  status: SharedAccessStatus;
  inviteToken?: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface TherapistNote {
  id: string;
  childId: string;
  therapistId: string;
  sharedAccessId: string;
  sessionDate: string;
  goalsWorkedOn?: string;
  skillsPracticed?: string;
  behaviorsObserved?: string;
  strategiesUsed?: string;
  recommendations?: string;
  nextSessionGoals?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteComment {
  id: string;
  noteId: string;
  commenterId: string;
  commenterName: string;
  commentText: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sharedAccessId: string;
  senderId: string;
  senderName: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}
