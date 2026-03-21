// ============================================================
// SHARED TYPESCRIPT TYPES — PrepSpace Platform
// ============================================================

// ── TENANCY ──────────────────────────────────────────────
export type TenantType = 'individual' | 'group' | 'company' | 'education' | 'platform';
export type PlanType = 'free' | 'pro' | 'elite' | 'company' | 'education';

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  type: TenantType;
  plan: PlanType;
  branding: {
    logo?: string;
    primaryColor?: string;
    interviewerName?: string;
    interviewerTone?: 'professional-warm' | 'professional-strict' | 'casual-friendly';
    companyContext?: string;
  };
  features: Record<string, boolean>;
}

// ── USERS ────────────────────────────────────────────────
export type UserRole = 'candidate' | 'recruiter' | 'educator' | 'group_admin' | 'tenant_admin' | 'platform_admin';

export interface UserProfile {
  id: string;
  tenantId: string;
  supabaseUid: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  xp: number;
  level: string;
  streakDays: number;
  streakLastAt?: string;
  fcmToken?: string;
  createdAt: string;
}

// ── ROADMAPS ─────────────────────────────────────────────
export type RoadmapSource = 'predefined' | 'jd' | 'custom';
export type RoadmapStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Roadmap {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  sourceType: RoadmapSource;
  rawJd?: string;
  parsedSkills?: ParsedJD;
  targetRole: string;
  targetCompany?: string;
  status: RoadmapStatus;
  totalModules: number;
  completedModules: number;
  readinessScore: number;
  createdAt: string;
}

export interface ParsedJD {
  title: string;
  company?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'staff' | 'principal';
  technicalKeywords: string[];
  behavioralKeywords: string[];
  salary?: { min?: number; max?: number; currency?: string };
}

// ── MODULES ──────────────────────────────────────────────
export type ModuleStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'ASSESSMENT_PENDING'
  | 'IN_PROGRESS'
  | 'REVISION'
  | 'COMPLETE'
  | 'MASTERED';

export type ModuleDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface ModuleTopic {
  name: string;
  weight: number;
  requiredCoverage: number;
}

export interface Module {
  id: string;
  tenantId: string;
  roadmapId: string;
  title: string;
  description: string;
  topics: ModuleTopic[];
  prerequisites: string[];
  sequenceOrder: number;
  difficulty: ModuleDifficulty;
  estimatedMinutes: number;
  status: ModuleStatus;
  currentScore?: number;
  lastSessionAt?: string;
  sessionCount: number;
  icon?: string;
  createdAt: string;
}

// ── INTERVIEW SESSIONS ───────────────────────────────────
export type SessionState =
  | 'INITIALIZING'
  | 'TOKEN_ISSUED'
  | 'CONNECTED'
  | 'WARMUP'
  | 'QUESTION_ASKING'
  | 'LISTENING'
  | 'EVALUATING'
  | 'FOLLOW_UP'
  | 'TRANSITIONING'
  | 'PAUSED'
  | 'COMPLETING'
  | 'PROCESSING'
  | 'COMPLETE'
  | 'ABORTED';

export type SessionType = 'assessment' | 'training' | 'practice' | 'mock_company' | 'peer';
export type InterviewType =
  | 'conceptual'
  | 'behavioral'
  | 'coding_walkthrough'
  | 'live_coding'
  | 'system_design'
  | 'debugging'
  | 'sql_data';

export interface SessionPlan {
  sessionId: string;
  moduleName: string;
  topicList: ModuleTopic[];
  totalQuestions: number;
  userCalibration: {
    strongTopics: string[];
    weakTopics: string[];
    untestedTopics: string[];
    speakingPatterns?: string;
    overallLevel: string;
    previousSessionCount: number;
  };
  interviewerName: string;
  interviewerTone: string;
  tenantContext?: string;
  companyName?: string;
  companyInterviewStyle?: string;
  practiceMode?: 'calibrated' | 'ruthless';
  targetRole: string;
  sessionNumber: number;
  systemPrompt: string;
  difficultyLevel: number;
  requiredTopics: string[];
  topicWeights: Record<string, number>;
  createdAt: string;
}

export interface QuestionLogEntry {
  questionText: string;
  topic: string;
  score: number;
  keyConceptsMissed: string[];
  strengths: string[];
  audioStartMs: number;
  audioEndMs: number;
  shouldProbe: boolean;
  probeQuestion?: string;
  integrity?: number;
  timestamp: string;
}

export interface ProctoringEvent {
  type: ProctoringSignal;
  timestamp: string;
  severity: 'info' | 'warning' | 'violation';
  details?: Record<string, unknown>;
}

export type ProctoringSignal =
  | 'tab_switch'
  | 'window_blur'
  | 'slow_answer_start'
  | 'copy_paste'
  | 'ai_generated_answer'
  | 'eye_gaze_off_screen'
  | 'multiple_faces'
  | 'long_silence_burst'
  | 'keyboard_during_voice';

export interface InterviewSession {
  id: string;
  tenantId: string;
  userId: string;
  moduleId?: string;
  pipelineId?: string;
  sessionType: SessionType;
  interviewType: InterviewType;
  state: SessionState;
  plan: SessionPlan;
  questionLog: QuestionLogEntry[];
  proctoringEvents: ProctoringEvent[];
  audioKey?: string;
  transcriptKey?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  createdAt: string;
}

// ── REPORTS ──────────────────────────────────────────────
export type HireRecommendation = 'strong_yes' | 'yes' | 'maybe' | 'no';
export type IntegrityBadge = 'verified' | 'caution' | 'flagged';

export interface CompetencyScore {
  technicalDepth: number;
  communicationClarity: number;
  problemSolving: number;
  conciseness: number;
  confidence: number;
  structuredThinking: number;
  domainBreadth: number;
  cultureFit: number;
}

export interface QuestionAnalysis {
  questionText: string;
  topic: string;
  score: number;
  aiRemarks: string;
  strengths: string[];
  improvements: string[];
  audioStartMs: number;
  audioEndMs: number;
  integrityScore: number;
}

export interface SpeakingAnalytics {
  avgWordsPerMinute: number;
  wordsPerMinuteByQuestion: number[];
  fillerWordCount: number;
  fillerWordTypes: Record<string, number>;
  avgAnswerLengthWords: number;
  avgPreAnswerPauseSecs: number;
  distribution: { tooShort: number; ideal: number; overExplained: number };
}

export interface AudioAnnotation {
  startMs: number;
  endMs: number;
  type: 'strong' | 'partial' | 'missed' | 'proctoring' | 'question_boundary';
  label: string;
  topicId?: string;
  score?: number;
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  overallScore: number;
  letterGrade: 'A+' | 'A' | 'B' | 'B-' | 'C' | 'D' | 'F';
  hireRecommendation: HireRecommendation;
  executiveSummary: string;
  top3Strengths: Array<{ text: string; audioTimestampMs: number }>;
  top3Improvements: Array<{ text: string; audioTimestampMs: number }>;
  competencyScores: CompetencyScore;
  topicCoverage: Record<string, { score: number; questionsAsked: number }>;
  questionAnalyses: QuestionAnalysis[];
  speakingAnalytics: SpeakingAnalytics;
  audioAnnotations: AudioAnnotation[];
  proctoringScore: number;
  integrityBadge: IntegrityBadge;
  proctoringFlags: ProctoringEvent[];
  recommendations: string[];
  generatedAt: string;
}

// ── SKILL GRAPH ──────────────────────────────────────────
export type SkillTrend = 'improving' | 'declining' | 'stable' | 'new';
export type OverallLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface TopicScore {
  currentScore: number;
  trend: SkillTrend;
  lastTestedAt: string;
  sessionCount: number;
  confidence: number; // 0-1, based on session count
}

export interface UserSkillGraph {
  id: string;
  userId: string;
  tenantId: string;
  topicScores: Record<string, TopicScore>;
  overallLevel: OverallLevel;
  readinessScore: number;
  updatedAt: string;
}

// ── GROUPS ───────────────────────────────────────────────
export type GroupAccessType = 'private' | 'public' | 'shared' | 'cohort' | 'company_track';
export type GroupMemberRole = 'owner' | 'admin' | 'member' | 'observer';

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  accessType: GroupAccessType;
  roadmapId?: string;
  memberCount: number;
  settings: {
    leaderboardEnabled: boolean;
    leaderboardAnonymous: boolean;
    deadlines?: Record<string, string>;
  };
  createdBy: string;
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  userProfile: UserProfile;
  role: GroupMemberRole;
  progress?: number;
  joinedAt: string;
}

// ── HIRING ───────────────────────────────────────────────
export interface HiringRound {
  name: string;
  sequence: number;
  type: 'ai_interview' | 'assessment' | 'resume_screen';
  durationMinutes: number;
  competencies: Array<{ name: string; weight: number; criteria: string[] }>;
  passThreshold: number;
  isProctored: boolean;
  interviewType: InterviewType;
}

export interface HiringPipeline {
  id: string;
  tenantId: string;
  roleName: string;
  rounds: HiringRound[];
  globalPassThreshold: number;
  deadline?: string;
  anonymizationEnabled: boolean;
  biasCheckEnabled: boolean;
  webhookUrl?: string;
  status: 'active' | 'paused' | 'closed';
  candidateCount: number;
  createdAt: string;
}

export type CandidateStage = 'invited' | 'in_progress' | 'completed' | 'shortlisted' | 'offer' | 'rejected';

export interface PipelineCandidate {
  id: string;
  pipelineId: string;
  userId?: string;
  email: string;
  name?: string;
  stage: CandidateStage;
  compositeScore?: number;
  roundScores: Record<string, number>;
  integrityMultiplier: number;
  invitedAt: string;
  completedAt?: string;
}

// ── RESUME ───────────────────────────────────────────────
export interface ResumeProfile {
  targetRole: string;
  targetCompany?: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: string[];
  certifications?: string[];
}

export interface WorkExperience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  isCurrentRole: boolean;
  bullets: string[];
}

export interface Education {
  degree: string;
  institution: string;
  field: string;
  graduationDate: string;
  gpa?: number;
}

export interface Project {
  name: string;
  description: string;
  techStack: string[];
  url?: string;
  bullets: string[];
}

export interface Resume {
  id: string;
  tenantId: string;
  userId: string;
  version: number;
  targetRole: string;
  targetCompany?: string;
  rawProfile: ResumeProfile;
  atsScore?: number;
  atsKeywordGaps?: string[];
  pdfStorageKey?: string;
  createdAt: string;
}

// ── GAMIFICATION ─────────────────────────────────────────
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
  isUnlocked: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  xp: number;
  level: string;
  streak: number;
}

// ── NOTIFICATIONS ────────────────────────────────────────
export type NotificationType =
  | 'report_ready'
  | 'streak_reminder'
  | 'group_deadline'
  | 'module_recommendation'
  | 'group_invite'
  | 'achievement_unlocked'
  | 'peer_matched'
  | 'candidate_completed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// ── API RESPONSES ────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown; requestId: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
  total?: number;
}

// ── COMPANY PROFILES (Mock Company Interview) ─────────────
export interface CompanyProfile {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  size: 'startup' | 'mid' | 'large' | 'enterprise';
  interviewCulture: string;
  rounds: Array<{
    name: string;
    type: InterviewType;
    duration: number;
    description: string;
  }>;
  knownPatterns: string[];
  communityPassRate: number;
  difficultyRating: number;
  techStack: string[];
}

// ── CONTINUE ACTION ──────────────────────────────────────
export type ContinueActionType =
  | 'resume_session'
  | 'start_assessment'
  | 'continue_module'
  | 'start_module'
  | 'roadmap_complete';

export interface ContinueAction {
  action: ContinueActionType;
  sessionId?: string;
  moduleId?: string;
}
