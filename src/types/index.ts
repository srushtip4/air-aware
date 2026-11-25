export type AqiCategoryBand =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface AqiCategoryInfo {
  band: AqiCategoryBand;
  minAqi: number;
  maxAqi: number | null;
  severityRank: number;
  colorToken: string;
  healthSummary: string;
  isUnhealthy: boolean;
}

export type AqiTrend = 'improving' | 'worsening' | 'stable' | 'insufficient_data';

export interface HourlyAqiPoint {
  timestamp: string;
  aqi: number;
  pm25?: number | null;
  pm10?: number | null;
}

export interface AqiTrendAnalysis {
  trend: AqiTrend;
  delta: number;
  percentChange: number | null;
  windowHours: number;
  summary: string;
}

export interface GeocodedLocation {
  name: string;
  region?: string;
  country: string;
  latitude: number;
  longitude: number;
  source: string;
}

export interface AirQualityReading {
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  band: AqiCategoryBand;
  source: string;
  timestamp: string;
  isDemoData: boolean;
  locationName: string;
  latitude: number;
  longitude: number;
  hourly: HourlyAqiPoint[];
  trend: AqiTrendAnalysis;
}

export interface AirQualityDataAdapter {
  readonly sourceName: string;
  getAirQuality(
    latitude: number,
    longitude: number,
    locationName?: string,
  ): Promise<AirQualityReading>;
  searchLocations(query: string, limit?: number): Promise<GeocodedLocation[]>;
}

export type CommuteMode =
  | 'car_petrol'
  | 'car_diesel'
  | 'motorcycle'
  | 'public_transit'
  | 'carpool'
  | 'bicycle'
  | 'walk'
  | 'work_from_home';

export type CookingFuel =
  | 'lpg'
  | 'electric_induction'
  | 'piped_gas'
  | 'biomass_wood'
  | 'coal_kerosene';

export type HeatingSource =
  | 'none'
  | 'electric_heater'
  | 'heat_pump'
  | 'gas_heater'
  | 'wood_biomass'
  | 'coal_charcoal';

export type HomeType =
  | 'apartment'
  | 'independent_house'
  | 'semi_detached'
  | 'shared_room';

export type BudgetTier = 'zero_cost' | 'low_cost' | 'moderate_investment';

export interface HouseholdMemberProfile {
  hasChildren: boolean;
  hasElderly: boolean;
  hasRespiratoryCondition: boolean;
  householdSize: number;
}

export interface UserProfile {
  locationQuery: string;
  household: HouseholdMemberProfile;
  commuteMode: CommuteMode;
  commuteDistanceKmOneWay: number;
  commuteDaysPerWeek: number;
  cookingFuel: CookingFuel;
  heatingSource: HeatingSource;
  homeType: HomeType;
  budgetTier: BudgetTier;
}

export type RecommendationCostTier = 'free' | 'low_cost' | 'investment';

export type RecommendationGroup =
  | 'dailyRoutine'
  | 'indoorHacks'
  | 'sustainableAlternatives';

export type TimeOfDaySlot =
  | 'early_morning'
  | 'midday'
  | 'evening'
  | 'night'
  | 'all_day';

export type ImpactActionId =
  | 'shift_car_to_transit'
  | 'shift_car_to_carpool'
  | 'shift_car_to_wfh'
  | 'shift_car_to_bike_walk'
  | 'shift_motorcycle_to_transit'
  | 'clean_cooking_biomass_to_lpg'
  | 'clean_cooking_lpg_to_induction'
  | 'stop_open_waste_burning'
  | 'replace_wood_heating_with_electric'
  | 'diy_box_fan_filter'
  | 'timed_ventilation_and_sealing'
  | 'kitchen_exhaust_ventilation';

export interface RecommendationItem {
  id: string;
  group: RecommendationGroup;
  title: string;
  summary: string;
  rationale: string;
  costTier: RecommendationCostTier;
  timeSlot?: TimeOfDaySlot;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  applicableToVulnerable: boolean;
  impactActionId?: ImpactActionId;
}

export interface SafetyPrecaution {
  id: string;
  severity: 'advisory' | 'warning' | 'emergency';
  title: string;
  guidance: string;
  targetGroups: string[];
}

export interface RecommendationPlan {
  band: AqiCategoryBand;
  trend: AqiTrend;
  dailyRoutine: RecommendationItem[];
  indoorHacks: RecommendationItem[];
  sustainableAlternatives: RecommendationItem[];
  safetyPrecautions: SafetyPrecaution[];
  medicalDisclaimer: string;
  generatedAt: string;
}

export interface ImpactMetricResult {
  value: number | null;
  unit: string;
  assumptions: string[];
  isEstimate: true;
  sourceCitation?: string;
  unavailableReason?: string;
}

export interface ActionImpactEstimate {
  actionId: ImpactActionId;
  label: string;
  avoidedCo2eKgPerWeek: ImpactMetricResult;
  avoidedPmGramsPerWeek: ImpactMetricResult;
  householdExposureReductionPct: ImpactMetricResult;
}

export interface CommunityProjection {
  householdCount: number;
  isProjection: true;
  label: string;
  weeklyAvoidedCo2eKg: ImpactMetricResult;
  weeklyAvoidedPmGrams: ImpactMetricResult;
}

export interface ImpactReport {
  perAction: ActionImpactEstimate[];
  weeklyTotal: {
    avoidedCo2eKg: ImpactMetricResult;
    avoidedPmGrams: ImpactMetricResult;
    combinedExposureReductionPct: ImpactMetricResult;
  };
  communityProjection: CommunityProjection;
}

export type HouseholdSizeBucket = 'single' | 'small_2_4' | 'large_5_plus';
export type CommuteDistanceBucket =
  | 'none'
  | 'short_1_5km'
  | 'medium_6_15km'
  | 'long_16km_plus';

/**
 * Coarse, privacy-preserving household summary sent to Gemini.
 * Never includes names, street addresses, or free-text health details.
 */
export interface CoarseProfileSummary {
  hasChildren: boolean;
  hasElderly: boolean;
  hasRespiratoryCondition: boolean;
  householdSizeBucket: HouseholdSizeBucket;
  commuteMode: CommuteMode;
  commuteDistanceBucket: CommuteDistanceBucket;
  cookingFuel: CookingFuel;
  heatingSource: HeatingSource;
  homeType: HomeType;
  budgetTier: BudgetTier;
}

export interface GeminiStructuredExplanation {
  headline: string;
  summary: string;
  dailyFocus: string[];
  impactExplanation: string;
  safetyReminder: string;
  followUpSuggestions: string[];
}

