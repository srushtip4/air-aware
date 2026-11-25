import type {
  ExposureBaseline,
  FactorConfidence,
  FactorKind,
} from '../../types';

export interface SourcedFactor {
  readonly value: number;
  readonly unit: string;
  readonly kind: FactorKind;
  readonly confidence: FactorConfidence;
  readonly citation: string;
  readonly note?: string;
  readonly baseline?: ExposureBaseline;
}

/**
 * ALL emission and exposure reduction factors used by AirAware's impact calculator.
 * Each factor is explicitly classified as:
 * - 'sourced': directly traced to a named published document and table/section.
 * - 'proxy': UK/EU/US published value used where no equivalent Indian national factor
 *   is available, with a note explaining stand-in validity and likely error direction.
 * - 'assumption': author estimate (with rationale and // TODO(verify) where empirical
 *   verification is needed).
 *
 * Where no defensible factor exists, the calculator returns `value: null` with an explanation.
 */
export const IMPACT_FACTORS = {
  // Proxy: UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land table (Medium petrol car).
  // TODO(verify against ARAI India passenger car CO2e/km fleet averages across compact hatchbacks).
  CAR_PETROL_CO2E_KG_PER_KM: {
    value: 0.171,
    unit: 'kg CO2e/km',
    kind: 'proxy',
    confidence: 'medium',
    citation:
      'UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land: Passenger vehicles table (Medium petrol car)',
    note: 'Used as a stand-in because standardized Indian per-km lifecycle car CO2e tables vary by model year. Indian private cars skew toward smaller-displacement hatchbacks, so a UK medium petrol car likely overstates emissions slightly for compact cars (overstating per-km savings), though stop-and-go urban congestion narrows the gap.',
  },

  // Proxy: UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land table (Average diesel car).
  // TODO(verify against ARAI India BS-VI diesel passenger car CO2e/km factors).
  CAR_DIESEL_CO2E_KG_PER_KM: {
    value: 0.17,
    unit: 'kg CO2e/km',
    kind: 'proxy',
    confidence: 'medium',
    citation:
      'UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land: Passenger vehicles table (Average diesel car)',
    note: 'Used as a stand-in where an updated national Indian fleet diesel passenger-car CO2e/km average is unavailable. Indian urban SUVs and older diesel sedans may emit near or slightly above this proxy, whereas compact diesels emit less; net error is likely modest in either direction.',
  },

  // Proxy: UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land table (Average motorbike).
  // TODO(verify against ARAI India 100-150cc two-wheeler CO2e/km figures, which are typically lower).
  MOTORCYCLE_CO2E_KG_PER_KM: {
    value: 0.114,
    unit: 'kg CO2e/km',
    kind: 'proxy',
    confidence: 'medium',
    citation:
      'UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land: Motorbike table (Average motorbike)',
    note: 'Used as a stand-in for powered two-wheelers in the absence of a single harmonized national CO2e/km factor. UK motorcycles skew toward larger engine displacements than Indian 100-150cc commuter bikes, so this proxy likely overstates Indian motorcycle emissions (and therefore overstates savings from shifting a motorcycle to bus transit).',
  },

  // Proxy: UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land table (Local bus).
  // TODO(verify against Indian municipal bus / metro operator CO2e per passenger-km disclosures).
  PUBLIC_TRANSIT_CO2E_KG_PER_PKM: {
    value: 0.102,
    unit: 'kg CO2e/passenger-km',
    kind: 'proxy',
    confidence: 'medium',
    citation:
      'UK DESNZ/DEFRA GHG Conversion Factors, Business travel - land: Public transport table (Local bus)',
    note: 'Used as a conservative urban bus stand-in because Indian city fleets mix diesel, CNG, electric buses, and metro rail without one national factor. UK buses carry fewer passengers on average than Indian urban buses, so this proxy likely overstates transit emissions per passenger-km and therefore understates CO2e savings when switching from car to public transit.',
  },

  // Author estimate: assumes 2.5 occupants per shared carpool vehicle (60% per-commuter VKT cut vs solo driving).
  // TODO(verify against local city commuter carpool occupancy surveys).
  CARPOOL_AVG_OCCUPANTS: {
    value: 2.5,
    unit: 'passengers/vehicle',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes 2.5 occupants per carpool trip (1 driver + 1.5 riders average, yielding 60% per-commuter VKT cut)',
  },

  // Author estimate: composite urban petrol car exhaust + brake/tyre wear PM2.5 magnitude.
  // TODO(verify exact Euro/BS-VI composite exhaust + non-exhaust PM2.5 factor in EMEP/EEA 1.A.3.b / ARAI tables).
  CAR_PETROL_PM25_G_PER_KM: {
    value: 0.025,
    unit: 'g PM2.5/km',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — composite petrol car tailpipe plus brake/tyre wear PM2.5 magnitude pending BS-VI / ARAI fleet lookup',
  },

  // Author estimate: composite urban diesel car exhaust + brake/tyre wear PM2.5 magnitude.
  // TODO(verify exact Euro/BS-IV & BS-VI composite diesel PM2.5 factor in EMEP/EEA 1.A.3.b / ARAI tables).
  CAR_DIESEL_PM25_G_PER_KM: {
    value: 0.045,
    unit: 'g PM2.5/km',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — composite diesel car tailpipe plus brake/tyre wear PM2.5 magnitude pending fleet-age lookup',
  },

  // Author estimate: commuter two-wheeler fleet average PM2.5 emission magnitude.
  // TODO(verify against ARAI two-wheeler PM emission measurements).
  MOTORCYCLE_PM25_G_PER_KM: {
    value: 0.03,
    unit: 'g PM2.5/km',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — two-wheeler exhaust and non-exhaust PM2.5 estimate across mixed 2-stroke/4-stroke fleets',
  },

  // Author estimate: urban bus PM2.5 assuming ~0.10 g/vehicle-km split across 20 passengers.
  // TODO(verify bus PM2.5/vkm and average peak-hour occupancy for target cities).
  PUBLIC_TRANSIT_PM25_G_PER_PKM: {
    value: 0.005,
    unit: 'g PM2.5/passenger-km',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes ~0.10 g PM2.5/bus-km distributed across 20 passengers',
  },

  // Author estimate: traditional mud/open wood cookstove PM2.5 emission magnitude (~7.2 g/kg dry wood).
  // TODO(verify exact table value in Smith et al. 2000 EPA-600/R-00-052 or CPCB cookstove tests).
  BIOMASS_COOKING_PM25_G_PER_KG_WOOD: {
    value: 7.2,
    unit: 'g PM2.5/kg wood',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — mid-range traditional wood cookstove PM2.5 emission magnitude',
  },

  // Author estimate: assumes 4.0 kg dry fuelwood burned per day for household cooking.
  // TODO(verify against NSSO / state rural-periurban fuelwood consumption surveys).
  BIOMASS_COOKING_KG_WOOD_PER_DAY: {
    value: 4.0,
    unit: 'kg wood/day',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes 4.0 kg/day dry fuelwood for daily household meals',
  },

  // Author estimate: clean LPG stove PM2.5 emission magnitude (~0.05 g/kg LPG).
  // TODO(verify exact table value in Smith et al. 2000 / WHO IAQ Section 3 LPG emissions).
  LPG_COOKING_PM25_G_PER_KG: {
    value: 0.05,
    unit: 'g PM2.5/kg LPG',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — low-particulate LPG stove PM2.5 combustion magnitude',
  },

  // Author estimate: assumes ~0.35 kg LPG/day (~14.2 kg cylinder every ~40 days).
  // TODO(verify against MoPNG / PPAC average domestic 14.2 kg cylinder refill interval).
  LPG_COOKING_KG_PER_DAY: {
    value: 0.35,
    unit: 'kg LPG/day',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes 0.35 kg/day LPG (approx. one 14.2 kg domestic cylinder every 40 days)',
  },

  // Author estimate: conservative point estimate for whole-home indoor PM2.5 reduction when replacing unvented biomass cooking with LPG.
  // Baseline: indoor_pm25 (applies where solid-fuel cooking is the primary indoor PM2.5 source).
  // TODO(verify point value against Bruce et al. 2015 / WHO IAQ meta-analysis range).
  BIOMASS_TO_LPG_EXPOSURE_REDUCTION_PCT: {
    value: 65,
    unit: '% indoor PM2.5 reduction',
    kind: 'assumption',
    confidence: 'low',
    baseline: 'indoor_pm25',
    citation:
      'Author estimate — conservative point estimate within wide field-study drops when replacing indoor biomass stoves with LPG',
    note: 'Applies to the whole-home indoor PM2.5 baseline when indoor biomass smoke is the primary household particle source.',
  },

  // Author estimate: open yard/organic waste burning PM2.5 emission magnitude (~10.5 g/kg dry waste).
  // TODO(verify exact emission factor in Akagi et al. 2011 Table 1 / US EPA AP-42).
  OPEN_WASTE_BURNING_PM25_G_PER_KG: {
    value: 10.5,
    unit: 'g PM2.5/kg waste',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — order-of-magnitude PM2.5 emission factor for open dry-leaf and residential waste burning',
  },

  // Author estimate: assumes 2.0 kg/week of dry leaves or yard waste diverted from open burning to composting.
  // TODO(verify with municipal solid waste characterization data).
  HOUSEHOLD_YARD_WASTE_KG_PER_WEEK: {
    value: 2.0,
    unit: 'kg waste/week',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes 2.0 kg/week household yard/leaf waste diverted from open burning',
  },

  // Author estimate: residential wood space-heating PM2.5 emission magnitude (~10.0 g/kg wood).
  // TODO(verify exact factor in US EPA AP-42 Section 1.10 Table 1.10-1).
  WOOD_HEATING_PM25_G_PER_KG: {
    value: 10.0,
    unit: 'g PM2.5/kg wood',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — residential solid-wood heating PM2.5 magnitude',
  },

  // Author estimate: assumes 5.0 kg/day winter wood space-heating fuel use.
  // TODO(verify against northern Indian winter household biomass heating surveys).
  WOOD_HEATING_KG_PER_DAY: {
    value: 5.0,
    unit: 'kg wood/day',
    kind: 'assumption',
    confidence: 'low',
    citation:
      'Author estimate — assumes 5.0 kg/day fuelwood burned for winter space heating',
  },

  // Author estimate: assumes replacing indoor wood/coal space heating cuts indoor PM2.5 exposure by 50%.
  // Baseline: indoor_pm25.
  // TODO(verify against measured winter indoor PM2.5 intervention studies).
  REPLACE_WOOD_HEATING_EXPOSURE_REDUCTION_PCT: {
    value: 50,
    unit: '% indoor PM2.5 reduction',
    kind: 'assumption',
    confidence: 'low',
    baseline: 'indoor_pm25',
    citation:
      'Author estimate — assumes solid-fuel space heating contributes half of indoor winter PM2.5 exposure',
    note: 'Applies to the whole-home indoor PM2.5 baseline.',
  },

  // Author estimate: conservative single-room portable MERV-13 DIY box-fan indoor PM2.5 reduction (55%).
  // Baseline: indoor_pm25.
  // TODO(verify typical air-change effectiveness across leaky urban apartments).
  DIY_BOX_FAN_EXPOSURE_REDUCTION_PCT: {
    value: 55,
    unit: '% indoor PM2.5 reduction',
    kind: 'assumption',
    confidence: 'low',
    baseline: 'indoor_pm25',
    citation:
      'Author estimate — conservative point estimate for continuous MERV-13 box-fan filtration in a closed room',
    note: 'Applies to the indoor PM2.5 baseline in the filtered living/sleeping room.',
  },

  // Author estimate: passive draft sealing and inversion-window ventilation timing (25% indoor PM2.5 reduction).
  // Baseline: indoor_pm25.
  // TODO(verify infiltration reduction across typical Indian/urban window assemblies).
  TIMED_VENTILATION_SEALING_EXPOSURE_REDUCTION_PCT: {
    value: 25,
    unit: '% indoor PM2.5 reduction',
    kind: 'assumption',
    confidence: 'low',
    baseline: 'indoor_pm25',
    citation:
      'Author estimate — conservative passive infiltration cut from sealing door/window gaps and avoiding peak-smog ventilation',
    note: 'Applies to the whole-home indoor PM2.5 baseline.',
  },

  // Author estimate: outdoor-vented kitchen exhaust and lid use capture ~50% of cooking-generated PM2.5.
  // Baseline: cooking_pm25 (NOT whole-home ambient indoor PM2.5).
  // TODO(verify capture efficiency distribution against Singer et al. 2012 / LBNL-5335E for Indian gas/frying kitchens).
  KITCHEN_EXHAUST_EXPOSURE_REDUCTION_PCT: {
    value: 50,
    unit: '% cooking PM2.5 reduction',
    kind: 'assumption',
    confidence: 'low',
    baseline: 'cooking_pm25',
    citation:
      'Author estimate — mid-range capture estimate for covered pots and outdoor kitchen exhaust',
    note: 'Applies ONLY to the cooking-generated PM2.5 baseline; not combined into ambient indoor infiltration totals.',
  },

  // Author estimate: conservative ceiling on combined multiplicative indoor PM2.5 reduction for non-hermetic homes.
  // Baseline: indoor_pm25.
  MAX_COMBINED_EXPOSURE_REDUCTION_PCT: {
    value: 90,
    unit: '% max combined reduction',
    kind: 'assumption',
    confidence: 'medium',
    baseline: 'indoor_pm25',
    citation:
      'Author estimate — conservative 90% ceiling for non-hermetic residential buildings so stacked indoor interventions cannot imply zero exposure',
    note: 'Applied after multiplicative combination (1 - product(1 - r_i)) across indoor_pm25 interventions.',
  },
} as const satisfies Record<string, SourcedFactor>;

