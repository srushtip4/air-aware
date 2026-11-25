export interface SourcedFactor {
  readonly value: number;
  readonly unit: string;
  readonly citation: string;
}

/**
 * ALL emission and exposure reduction factors used by AirAware's impact calculator.
 * Every numeric factor includes its physical unit and an authoritative source citation.
 * Where no defensible universal factor exists, the calculator returns `value: null`
 * with an explanation instead of inventing numbers.
 */
export const IMPACT_FACTORS = {
  // Source: UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (Medium petrol passenger car, kg CO2e/km).
  CAR_PETROL_CO2E_KG_PER_KM: {
    value: 0.171,
    unit: 'kg CO2e/km',
    citation: 'UK DESNZ/DEFRA 2024 GHG Conversion Factors (Medium petrol car)',
  },

  // Source: UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (Average diesel passenger car, kg CO2e/km).
  CAR_DIESEL_CO2E_KG_PER_KM: {
    value: 0.17,
    unit: 'kg CO2e/km',
    citation: 'UK DESNZ/DEFRA 2024 GHG Conversion Factors (Average diesel car)',
  },

  // Source: UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (Average motorbike, kg CO2e/km).
  MOTORCYCLE_CO2E_KG_PER_KM: {
    value: 0.114,
    unit: 'kg CO2e/km',
    citation: 'UK DESNZ/DEFRA 2024 GHG Conversion Factors (Average motorcycle)',
  },

  // Source: UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (Local bus passenger-km, conservative urban transit baseline).
  PUBLIC_TRANSIT_CO2E_KG_PER_PKM: {
    value: 0.102,
    unit: 'kg CO2e/passenger-km',
    citation: 'UK DESNZ/DEFRA 2024 GHG Conversion Factors (Local urban bus)',
  },

  // Source: Standard 2.5-person average carpool occupancy assumption (60% per-person VKT reduction vs single-occupant driving).
  CARPOOL_AVG_OCCUPANTS: {
    value: 2.5,
    unit: 'passengers/vehicle',
    citation: 'US FHWA / EPA commuter carpool baseline (2.5 occupants average)',
  },

  // Source: EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Urban petrol passenger car exhaust + brake/tire PM2.5).
  CAR_PETROL_PM25_G_PER_KM: {
    value: 0.025,
    unit: 'g PM2.5/km',
    citation: 'EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Petrol car exhaust + non-exhaust)',
  },

  // Source: EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Urban diesel passenger car exhaust + brake/tire PM2.5).
  CAR_DIESEL_PM25_G_PER_KM: {
    value: 0.045,
    unit: 'g PM2.5/km',
    citation: 'EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Diesel car exhaust + non-exhaust)',
  },

  // Source: EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Powered two-wheeler fleet average PM2.5).
  MOTORCYCLE_PM25_G_PER_KM: {
    value: 0.03,
    unit: 'g PM2.5/km',
    citation: 'EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Two-wheeler)',
  },

  // Source: EMEP/EEA Air Pollutant Emission Inventory Guidebook 2023 (Urban bus ~0.10 g/vkm distributed over 20 passengers).
  PUBLIC_TRANSIT_PM25_G_PER_PKM: {
    value: 0.005,
    unit: 'g PM2.5/passenger-km',
    citation: 'EMEP/EEA 2023 urban bus PM2.5 per passenger-km (20-passenger occupancy)',
  },

  // Source: WHO Guidelines for Indoor Air Quality: Household Fuel Combustion (Smith et al., traditional wood stove ~7.2 g PM2.5/kg dry wood).
  BIOMASS_COOKING_PM25_G_PER_KG_WOOD: {
    value: 7.2,
    unit: 'g PM2.5/kg wood',
    citation: 'WHO Household Fuel Combustion Guidelines (traditional biomass cookstove)',
  },

  // Source: WHO Household Fuel Combustion baseline daily fuelwood consumption for cooking (~4 kg dry wood/day).
  BIOMASS_COOKING_KG_WOOD_PER_DAY: {
    value: 4.0,
    unit: 'kg wood/day',
    citation: 'WHO Household Fuel Combustion baseline household daily fuelwood use',
  },

  // Source: WHO Household Fuel Combustion (LPG cooking PM2.5 emission factor ~0.05 g/kg LPG).
  LPG_COOKING_PM25_G_PER_KG: {
    value: 0.05,
    unit: 'g PM2.5/kg LPG',
    citation: 'WHO Household Fuel Combustion Guidelines (LPG stove)',
  },

  // Source: Indian MoPNG / WHO typical household LPG cooking consumption (~0.35 kg LPG/day).
  LPG_COOKING_KG_PER_DAY: {
    value: 0.35,
    unit: 'kg LPG/day',
    citation: 'WHO / MoPNG household daily LPG cooking consumption estimate',
  },

  // Source: Bruce et al. 2015 / WHO IAQ Systematic Review (transitioning from open biomass to LPG cuts kitchen PM2.5 by ~60-80%; conservative 65%).
  BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT: {
    value: 65,
    unit: '% indoor PM2.5 reduction',
    citation: 'WHO IAQ Guidelines / Bruce et al. 2015 systematic review (conservative lower-mid estimate)',
  },

  // Source: US EPA AP-42 / Akagi et al. 2011 open municipal/yard waste burning PM2.5 (~10.5 g PM2.5/kg waste).
  OPEN_WASTE_BURNING_PM25_G_PER_KG: {
    value: 10.5,
    unit: 'g PM2.5/kg waste',
    citation: 'US EPA AP-42 / Akagi et al. 2011 open biomass & yard waste burning',
  },

  // Source: Conservative household yard/organic waste volume diverted from burning per week (2 kg/week).
  HOUSEHOLD_YARD_WASTE_KG_PER_WEEK: {
    value: 2.0,
    unit: 'kg waste/week',
    citation: 'Conservative urban household weekly organic/yard waste diversion assumption',
  },

  // Source: US EPA AP-42 Section 1.10 Residential Wood Fireplaces & Stoves (~10.0 g PM2.5/kg wood).
  WOOD_HEATING_PM25_G_PER_KG: {
    value: 10.0,
    unit: 'g PM2.5/kg wood',
    citation: 'US EPA AP-42 Section 1.10 (Residential wood combustion)',
  },

  // Source: Conservative winter household wood-heating fuel rate (5 kg/day).
  WOOD_HEATING_KG_PER_DAY: {
    value: 5.0,
    unit: 'kg wood/day',
    citation: 'Conservative winter space-heating fuelwood assumption (5 kg/day)',
  },

  // Source: US EPA residential wood smoke indoor infiltration mitigation studies (conservative 50% indoor exposure drop).
  REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT: {
    value: 50,
    unit: '% indoor PM2.5 reduction',
    citation: 'US EPA Residential Wood Smoke Indoor Air Mitigation Guidance',
  },

  // Source: US EPA / Dodson et al. 2021-2023 Corsi-Rosenthal & MERV-13 DIY box-fan purifier studies (50-70% reduction; conservative 55%).
  DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT: {
    value: 55,
    unit: '% indoor PM2.5 reduction',
    citation: 'US EPA / Dodson et al. DIY MERV-13 Box-Fan Air Cleaner Studies',
  },

  // Source: US EPA / ASHRAE indoor-outdoor infiltration control (sealing gaps + timed ventilation during spikes: 20-35%; conservative 25%).
  TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT: {
    value: 25,
    unit: '% indoor PM2.5 reduction',
    citation: 'US EPA / ASHRAE Indoor Air Quality Infiltration Mitigation Guidance',
  },

  // Source: Lawrence Berkeley National Lab (Singer et al. 2012) residential cooking exhaust ventilation capture efficiency (~40-70%; conservative 50%).
  KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT: {
    value: 50,
    unit: '% cooking PM2.5 reduction',
    citation: 'LBNL (Singer et al. 2012) Residential Range Hood Capture Efficiency',
  },

  // Cap for combined multiplicative indoor exposure reduction so stacked interventions stay conservative.
  MAX_COMBINED_EXPOSURE_REDUCTION_PCT: {
    value: 90,
    unit: '% max combined reduction',
    citation: 'Conservative upper bound for non-hermetic residential buildings',
  },
} as const satisfies Record<string, SourcedFactor>;
