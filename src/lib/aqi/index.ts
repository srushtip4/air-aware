export {
  INDIAN_AQI_BANDS,
  categorize,
  computeIndianAqiFromPm,
  getBandMetadata,
} from './bands';
export { analyzeAqiTrend } from './trend';
export type { TrendOptions } from './trend';
export {
  AirQualityAdapterError,
  DemoAirQualityAdapter,
  OpenMeteoAdapter,
} from './adapter';
export type { DemoPreset, OpenMeteoAdapterOptions } from './adapter';
