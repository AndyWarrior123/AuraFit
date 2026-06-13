export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type CharacterClass = 'NOVICE' | 'WARRIOR' | 'RANGER' | 'MAGE'
export type ActivitySource = 'VOICE' | 'HEALTH_CONNECT' | 'MANUAL'
export type ExerciseType =
  | 'RUN' | 'WALK' | 'CYCLE' | 'SWIM' | 'HIKE'
  | 'LIFT' | 'YOGA' | 'PILATES' | 'HIIT' | 'STRETCH'
  | 'SPORT' | 'OTHER'
export type HeartRateZone = 'REST' | 'FAT_BURN' | 'CARDIO' | 'PEAK'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user_id: string
}

export interface UserRead {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  height_cm: number | null
  weight_kg: number | null
  age_years: number | null
  gender: Gender | null
  bmr: number | null
  bmi: number | null
  character_class: CharacterClass
  total_xp: number
  current_level: number
  profile_complete: boolean
}

export interface AttributeDetail {
  score: number
  label: string
  driven_by: string
}

export interface AttributeBreakdown {
  strength: AttributeDetail
  endurance: AttributeDetail
  vitality: AttributeDetail
  agility: AttributeDetail
  recovery: AttributeDetail
  discipline: AttributeDetail
}

export interface CharacterStatsRead {
  id: number
  user_id: string
  stat_date: string
  strength: number
  endurance: number
  vitality: number
  agility: number
  recovery: number
  discipline: number
  daily_xp_earned: number
  cumulative_xp: number
  level_at_snapshot: number
  xp_to_next_level: number
  total_steps: number
  total_active_minutes: number
  total_calories_burned: number
  total_water_ml: number
  avg_heart_rate_bpm: number | null
  sleep_minutes: number
  current_streak_days: number
  longest_streak_days: number
  character_class: CharacterClass
}

export interface CharacterSheetRead {
  stats: CharacterStatsRead
  attributes: AttributeBreakdown
}

export interface ActivityLogRead {
  id: number
  user_id: string
  log_date: string
  logged_at: string
  source: ActivitySource
  exercise_type: ExerciseType | null
  duration_minutes: number | null
  distance_km: number | null
  calories_burned: number | null
  reps_count: number | null
  sets_count: number | null
  weight_lifted_kg: number | null
  heart_rate_bpm: number | null
  heart_rate_zone: HeartRateZone | null
  water_ml: number | null
  calories_consumed: number | null
  meal_description: string | null
  sleep_duration_minutes: number | null
  sleep_quality_score: number | null
  steps_count: number | null
  xp_awarded: number
  raw_transcript: string | null
}

export interface DailySummaryRead {
  summary_date: string
  total_steps: number
  total_active_minutes: number
  total_calories_burned: number
  total_water_ml: number
  sleep_minutes: number
  xp_earned_today: number
  activity_count: number
  logs: ActivityLogRead[]
}

export interface ProfileSetupRequest {
  display_name: string
  height_cm: number
  weight_kg: number
  age_years: number
  gender: Gender
}

export interface VoiceParseRequest {
  transcript: string
  log_date?: string
}
