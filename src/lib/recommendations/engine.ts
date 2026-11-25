import type {
  AqiCategoryBand,
  AqiTrend,
  RecommendationItem,
  RecommendationPlan,
  SafetyPrecaution,
  UserProfile,
} from '../../types';
import { getBandMetadata } from '../aqi';

export interface RecommendationInput {
  band: AqiCategoryBand;
  trend: AqiTrend;
  profile: UserProfile;
  now?: Date;
}

export const MEDICAL_DISCLAIMER =
  'Not medical advice: AirAware provides general environmental and exposure-reduction guidance based on air quality data. Always follow instructions from a qualified healthcare professional for asthma, heart, lung, or pediatric symptoms.';

function hasVulnerableMembers(profile: UserProfile): boolean {
  const { hasChildren, hasElderly, hasRespiratoryCondition } = profile.household;
  return hasChildren || hasElderly || hasRespiratoryCondition;
}

function buildDailyRoutine(
  band: AqiCategoryBand,
  trend: AqiTrend,
  profile: UserProfile,
): RecommendationItem[] {
  const vulnerable = hasVulnerableMembers(profile);
  const items: RecommendationItem[] = [];
  const isSevereOrVeryPoor = band === 'Very Poor' || band === 'Severe';
  const isPoorOrWorse = band === 'Poor' || isSevereOrVeryPoor;
  const exposedCommute =
    profile.commuteMode === 'walk' ||
    profile.commuteMode === 'bicycle' ||
    profile.commuteMode === 'motorcycle';

  // Early morning slot
  if (isSevereOrVeryPoor) {
    items.push({
      id: 'routine-morning-stay-indoors',
      group: 'dailyRoutine',
      timeSlot: 'early_morning',
      title: 'Keep early-morning hours strictly indoors',
      summary:
        'Winter morning inversions trap dense PM2.5 near street level between 05:30 and 09:30. Replace dawn walks or outdoor play with indoor stretching.',
      rationale: `AQI band is ${band}; cool stagnant morning air concentrates particulates near breathing height.`,
      costTier: 'free',
      priority: 'critical',
      tags: ['inversion', 'morning', 'exposure'],
      applicableToVulnerable: true,
    });
  } else if (band === 'Poor' || (band === 'Moderate' && vulnerable)) {
    items.push({
      id: 'routine-morning-delay-outdoor',
      group: 'dailyRoutine',
      timeSlot: 'early_morning',
      title: 'Delay outdoor exercise until late morning',
      summary:
        'Postpone jogging, school-yard sports, or morning walks until midday sun disperses surface haze.',
      rationale:
        vulnerable
          ? `AQI is ${band} and household includes vulnerable members who react earlier to morning haze.`
          : `AQI is ${band}; early-morning dispersion is typically poor.`,
      costTier: 'free',
      priority: 'high',
      tags: ['morning', 'exercise'],
      applicableToVulnerable: vulnerable,
    });
  } else {
    items.push({
      id: 'routine-morning-normal',
      group: 'dailyRoutine',
      timeSlot: 'early_morning',
      title: 'Safe window for outdoor activity with light dust awareness',
      summary:
        'Morning air quality supports regular outdoor walks and active school commutes.',
      rationale: `AQI band is ${band}, posing minimal risk for healthy individuals.`,
      costTier: 'free',
      priority: 'low',
      tags: ['morning', 'active'],
      applicableToVulnerable: false,
    });
  }

  // Midday slot (ventilation & errands)
  if (band === 'Severe') {
    items.push({
      id: 'routine-midday-minimal-travel',
      group: 'dailyRoutine',
      timeSlot: 'midday',
      title: 'Consolidate essential errands into one midday trip',
      summary:
        'Even if midday sun lifts haze slightly, keep windows sealed in Severe conditions and bundle essential errands into a single short trip wearing a well-fitted N95/FFP2.',
      rationale:
        trend === 'improving'
          ? 'Although trend is improving, Severe AQI remains hazardous throughout the day.'
          : 'Severe AQI requires minimizing cumulative outdoor minutes.',
      costTier: 'free',
      priority: 'critical',
      tags: ['midday', 'errands', 'n95'],
      applicableToVulnerable: true,
    });
  } else if (isPoorOrWorse || (band === 'Moderate' && vulnerable)) {
    items.push({
      id: 'routine-midday-window',
      group: 'dailyRoutine',
      timeSlot: 'midday',
      title: 'Use 12:00–15:30 as your brief errand and airing window',
      summary:
        trend === 'worsening'
          ? 'Complete essential errands before mid-afternoon because pollution levels are currently rising.'
          : 'Thermal mixing is strongest midday; schedule short essential errands or brief cross-ventilation now if outdoor haze looks lighter.',
      rationale:
        trend === 'worsening'
          ? `Trend is worsening in ${band} conditions; acting earlier avoids heavier late-day buildup.`
          : `Midday atmospheric mixing typically gives the lowest hourly concentration in ${band} conditions.`,
      costTier: 'free',
      priority: 'high',
      tags: ['midday', 'ventilation', 'timing'],
      applicableToVulnerable: true,
    });
  } else {
    items.push({
      id: 'routine-midday-ventilate',
      group: 'dailyRoutine',
      timeSlot: 'midday',
      title: 'Refresh indoor rooms with midday cross-ventilation',
      summary:
        'Open opposite-facing windows for 20–30 minutes around midday to flush out indoor CO2 and cooking humidity.',
      rationale: `Outdoor AQI (${band}) is cleaner than stagnant indoor CO2 buildup.`,
      costTier: 'free',
      priority: 'medium',
      tags: ['midday', 'ventilation'],
      applicableToVulnerable: true,
    });
  }

  // Commute-specific routine item
  if (exposedCommute && profile.commuteDistanceKmOneWay > 0 && isPoorOrWorse) {
    items.push({
      id: 'routine-commute-protection',
      group: 'dailyRoutine',
      timeSlot: 'all_day',
      title: 'Protect exposed commute or switch temporarily to enclosed transit',
      summary: `Your ${profile.commuteMode} commute (${profile.commuteDistanceKmOneWay} km each way) increases breathing rate near traffic exhaust. Wear a tight-seal N95/FFP2 or use metro/bus on ${band} days.`,
      rationale: `Active/two-wheeler commuters inhale higher roadside PM2.5 doses during ${band} conditions.`,
      costTier: profile.budgetTier === 'zero_cost' ? 'free' : 'low_cost',
      priority: 'critical',
      tags: ['commute', 'n95', 'traffic'],
      applicableToVulnerable: true,
    });
  }

  // Evening & Night slots
  items.push({
    id: 'routine-evening-lockdown',
    group: 'dailyRoutine',
    timeSlot: 'evening',
    title: isPoorOrWorse
      ? 'Close windows before 17:00 and avoid evening traffic corridors'
      : 'Monitor evening traffic and biomass smoke before airing rooms',
    summary:
      isPoorOrWorse || trend === 'worsening'
        ? 'Evening rush hour, falling temperatures, and local waste/wood smoke spike PM2.5 after sunset. Keep doors and windows shut through the night.'
        : 'Avoid lingering near busy intersections at rush hour; close street-facing windows if smoke odor appears.',
    rationale:
      trend === 'worsening'
        ? 'Hourly trend is worsening ahead of overnight boundary-layer cooling.'
        : 'Evening cooling traps traffic and combustion smoke near ground level.',
    costTier: 'free',
    priority: isPoorOrWorse ? 'high' : 'medium',
    tags: ['evening', 'night', 'sealing'],
    applicableToVulnerable: true,
  });

  if (isSevereOrVeryPoor) {
    items.push({
      id: 'routine-night-clean-sleep-zone',
      group: 'dailyRoutine',
      timeSlot: 'night',
      title: 'Create a low-particle sleeping room for overnight recovery',
      summary:
        'Keep bedroom doors closed, run filtration if available, and place damp towels along bottom door gaps so overnight breathing load stays as low as possible.',
      rationale: '8 hours of sleep represents one-third of daily lung exposure.',
      costTier: 'free',
      priority: 'high',
      tags: ['night', 'sleep', 'indoor'],
      applicableToVulnerable: true,
    });
  }

  return items;
}

function buildIndoorHacks(
  band: AqiCategoryBand,
  trend: AqiTrend,
  profile: UserProfile,
): RecommendationItem[] {
  const hacks: RecommendationItem[] = [];
  const isUnhealthy = getBandMetadata(band).isUnhealthy;
  const vulnerable = hasVulnerableMembers(profile);

  // FREE TIER (always included)
  hacks.push({
    id: 'hack-free-ventilation-timing',
    group: 'indoorHacks',
    title: 'Timed cross-ventilation & outdoor-spike lockdown',
    summary:
      isUnhealthy || trend === 'worsening'
        ? 'Keep windows shut during morning/evening peaks and when AQI is worsening; open briefly only if midday air clears.'
        : 'Ventilate for 20 minutes midday while keeping traffic-facing windows shut during rush hour.',
    rationale: 'Synchronizing window opening with atmospheric dispersion cuts infiltration without extra cost.',
    costTier: 'free',
    priority: isUnhealthy ? 'critical' : 'medium',
    tags: ['ventilation', 'free', profile.homeType],
    applicableToVulnerable: true,
    impactActionId: 'timed_ventilation_and_sealing',
  });

  hacks.push({
    id: 'hack-free-gap-sealing',
    group: 'indoorHacks',
    title:
      profile.homeType === 'shared_room'
        ? 'Seal your single-room door sweep and window edges with rolled cloth'
        : 'Block door undercuts and window drafts with damp rolled towels',
    summary:
      profile.homeType === 'independent_house' || profile.homeType === 'semi_detached'
        ? 'Ground-level entry doors and older wooden frames leak heavy smog; press rolled damp towels at bottom door thresholds overnight.'
        : 'Press rolled cloths along balcony sliding tracks and front-door gaps during peak smog hours.',
    rationale: `Tailored to ${profile.homeType} leakage paths to slow outdoor PM2.5 entry.`,
    costTier: 'free',
    priority: isUnhealthy ? 'high' : 'low',
    tags: ['sealing', 'free', profile.homeType],
    applicableToVulnerable: true,
    impactActionId: 'timed_ventilation_and_sealing',
  });

  hacks.push({
    id: 'hack-free-cooking-ventilation',
    group: 'indoorHacks',
    title: 'Cover pots, vent cooking steam, and pause indoor smoke sources',
    summary:
      'Use lids when simmering/frying, run kitchen exhaust or crack only the kitchen window while cooking, and eliminate incense sticks, mosquito coils, and candles.',
    rationale:
      'High-heat frying and indoor incense spike indoor PM2.5 above outdoor Severe levels within minutes.',
    costTier: 'free',
    priority: 'high',
    tags: ['cooking', 'free', profile.cookingFuel],
    applicableToVulnerable: true,
    impactActionId: 'kitchen_exhaust_ventilation',
  });

  hacks.push({
    id: 'hack-free-wet-mopping',
    group: 'indoorHacks',
    title: 'Wet-mop floors and wipe sills instead of dry sweeping',
    summary:
      'Dry brooms kick settled fine dust back into breathing height. Use a damp mop or microfiber cloth daily.',
    rationale: 'Prevents resuspension of toxic heavy-metal and soot particles indoors.',
    costTier: 'free',
    priority: vulnerable || isUnhealthy ? 'high' : 'low',
    tags: ['cleaning', 'free'],
    applicableToVulnerable: true,
  });

  // LOW-COST TIER
  if (profile.budgetTier === 'low_cost' || profile.budgetTier === 'moderate_investment') {
    hacks.push({
      id: 'hack-lowcost-diy-box-fan',
      group: 'indoorHacks',
      title: 'Build a DIY box-fan + MERV-13 filter cleaner (Corsi-Rosenthal style)',
      summary:
        'Tape a MERV-13 pleated furnace filter onto the intake side of a standard box fan (airflow arrow pointing into the fan) to clean bedroom air at a fraction of commercial purifier cost.',
      rationale:
        'Peer-reviewed tests show DIY MERV-13 box-fan filters cut indoor PM2.5 by ~50–70% in closed rooms.',
      costTier: 'low_cost',
      priority: isUnhealthy || vulnerable ? 'critical' : 'medium',
      tags: ['filtration', 'diy', 'low_cost'],
      applicableToVulnerable: true,
      impactActionId: 'diy_box_fan_filter',
    });

    hacks.push({
      id: 'hack-lowcost-weatherstripping',
      group: 'indoorHacks',
      title: 'Apply adhesive foam weatherstripping and rubber door sweeps',
      summary:
        'Install low-cost peel-and-stick EPDM foam strips around window sashes and a bottom sweep on exterior doors.',
    rationale: `Reduces continuous smog leakage in ${profile.homeType} frames throughout winter.`,
      costTier: 'low_cost',
      priority: isUnhealthy ? 'high' : 'low',
      tags: ['sealing', 'weatherstripping', 'low_cost'],
      applicableToVulnerable: true,
      impactActionId: 'timed_ventilation_and_sealing',
    });
  }

  // INVESTMENT TIER
  if (profile.budgetTier === 'moderate_investment') {
    hacks.push({
      id: 'hack-investment-hepa-purifier',
      group: 'indoorHacks',
      title: 'Run a true HEPA (H13) air purifier sized to bedroom CADR',
      summary:
        'Place a certified HEPA H13 purifier (without ionizer/ozone mode) in the primary sleeping room, targeting at least 4 air changes per hour.',
      rationale:
        'True HEPA H13 captures ≥99.95% of 0.3 µm particles continuously without generating ozone.',
      costTier: 'investment',
      priority: isUnhealthy || vulnerable ? 'high' : 'medium',
      tags: ['hepa', 'investment'],
      applicableToVulnerable: true,
    });

    if (profile.cookingFuel === 'lpg' || profile.cookingFuel === 'piped_gas') {
      hacks.push({
        id: 'hack-investment-induction-addon',
        group: 'indoorHacks',
        title: 'Use a portable induction burner for daily boiling and simmering',
        summary:
          'Offloading tea, rice, and slow-simmer dishes to an electric induction hotplate removes indoor NO2 and flame moisture.',
        rationale: 'Gas combustion indoors emits NO2 and ultrafine particles even without smoke.',
        costTier: 'investment',
        priority: vulnerable ? 'high' : 'medium',
        tags: ['cooking', 'induction', 'investment'],
        applicableToVulnerable: true,
        impactActionId: 'clean_cooking_lpg_to_induction',
      });
    }
  }

  return hacks;
}

function buildSustainableAlternatives(
  band: AqiCategoryBand,
  profile: UserProfile,
): RecommendationItem[] {
  const items: RecommendationItem[] = [];
  const isUnhealthy = getBandMetadata(band).isUnhealthy;
  const isMotorizedPrivate =
    profile.commuteMode === 'car_petrol' ||
    profile.commuteMode === 'car_diesel' ||
    profile.commuteMode === 'motorcycle';

  // Commute alternatives
  if (isMotorizedPrivate && profile.commuteDistanceKmOneWay > 0) {
    if (profile.commuteDistanceKmOneWay <= 5) {
      items.push({
        id: 'alt-commute-short-active',
        group: 'sustainableAlternatives',
        title: isUnhealthy
          ? 'Shift short <5 km trips to local bus/metro on high-smog days'
          : 'Walk or cycle your short <5 km commute instead of driving',
        summary:
          isUnhealthy
            ? `Your ${profile.commuteDistanceKmOneWay} km trip creates disproportionately high cold-start tailpipe emissions; use public transit when AQI is ${band} and walk/cycle on cleaner days.`
            : `Short ${profile.commuteDistanceKmOneWay} km cold-start trips emit the most pollution per km; walking or cycling eliminates tailpipe CO2e and PM2.5 completely.`,
        rationale: 'Short motorized trips suffer peak cold-engine catalytic inefficiency.',
        costTier: 'free',
        priority: 'high',
        tags: ['commute', 'short-trip'],
        applicableToVulnerable: false,
        impactActionId: isUnhealthy
          ? profile.commuteMode === 'motorcycle'
            ? 'shift_motorcycle_to_transit'
            : 'shift_car_to_transit'
          : 'shift_car_to_bike_walk',
      });
    } else {
      items.push({
        id: 'alt-commute-transit',
        group: 'sustainableAlternatives',
        title: 'Switch regular commute to metro, rail, or bus transit',
        summary: `Replacing ${profile.commuteDistanceKmOneWay} km one-way ${profile.commuteMode} trips with public transit cuts per-commuter CO2e and roadside PM2.5.`,
        rationale: 'Higher passenger occupancy sharply lowers particulate emissions per person-km.',
        costTier: 'low_cost',
        priority: 'high',
        tags: ['transit', 'commute'],
        applicableToVulnerable: true,
        impactActionId:
          profile.commuteMode === 'motorcycle'
            ? 'shift_motorcycle_to_transit'
            : 'shift_car_to_transit',
      });

      if (profile.commuteMode === 'car_petrol' || profile.commuteMode === 'car_diesel') {
        items.push({
          id: 'alt-commute-carpool',
          group: 'sustainableAlternatives',
          title: 'Coordinate a 2–3 person neighborhood or office carpool',
          summary:
            'Where transit routes are sparse, sharing rides cuts vehicle-kilometers and fuel cost by more than half.',
          rationale: 'Directly removes single-occupancy cars during peak winter traffic.',
          costTier: 'free',
          priority: 'medium',
          tags: ['carpool', 'community'],
          applicableToVulnerable: true,
          impactActionId: 'shift_car_to_carpool',
        });
      }

      if (isUnhealthy && profile.commuteDaysPerWeek >= 2) {
        items.push({
          id: 'alt-commute-wfh-hybrid',
          group: 'sustainableAlternatives',
          title: 'Request 2 remote-work days/week during Severe/Poor smog alerts',
          summary:
            'Replacing 2 peak smog commutes per week avoids traffic exposure and removes round-trip exhaust emissions.',
          rationale: 'Cuts both personal rush-hour inhalation and aggregate road congestion.',
          costTier: 'free',
          priority: 'high',
          tags: ['wfh', 'smog-alert'],
          applicableToVulnerable: true,
          impactActionId: 'shift_car_to_wfh',
        });
      }
    }
  } else {
    items.push({
      id: 'alt-commute-keep-low-emission',
      group: 'sustainableAlternatives',
      title: 'Maintain your low-emission commute and combine errands',
      summary: `Your current commute (${profile.commuteMode}) already avoids private car tailpipe pollution. Bundle errands into single trips and advocate for shaded, swept transit stops.`,
      rationale: 'Low-emission travel keeps neighborhood roadside PM2.5 lower for everyone.',
      costTier: 'free',
      priority: 'low',
      tags: ['commute', 'low-emission'],
      applicableToVulnerable: true,
    });
  }

  // Cooking fuel alternatives
  if (profile.cookingFuel === 'biomass_wood' || profile.cookingFuel === 'coal_kerosene') {
    items.push({
      id: 'alt-cooking-clean-transition',
      group: 'sustainableAlternatives',
      title: 'Transition from solid wood/coal cooking to LPG or electric induction',
      summary:
        'Unvented wood, dung, or coal stoves release extreme indoor PM2.5. Prioritize subsidized LPG refill programs or shared community clean-cooking kitchens.',
      rationale: 'WHO identifies clean cooking fuel transitions as one of the highest-impact PM2.5 health interventions.',
      costTier: profile.budgetTier === 'zero_cost' ? 'low_cost' : 'investment',
      priority: 'critical',
      tags: ['cooking', 'biomass', 'lpg'],
      applicableToVulnerable: true,
      impactActionId: 'clean_cooking_biomass_to_lpg',
    });
  } else if (profile.cookingFuel === 'lpg' || profile.cookingFuel === 'piped_gas') {
    items.push({
      id: 'alt-cooking-electric-shift',
      group: 'sustainableAlternatives',
      title: 'Shift water boiling and slow-simmering to electric kettle or induction',
      summary:
        'Using an electric kettle or induction burner reduces indoor NO2 and combustion moisture when windows are closed for smog.',
      rationale: 'Cuts flame-related indoor pollutants in tightly sealed winter homes.',
      costTier: 'low_cost',
      priority: 'medium',
      tags: ['cooking', 'electric'],
      applicableToVulnerable: true,
      impactActionId: 'clean_cooking_lpg_to_induction',
    });
  }

  // Heating alternatives
  if (profile.heatingSource === 'wood_biomass' || profile.heatingSource === 'coal_charcoal') {
    items.push({
      id: 'alt-heating-no-solid-burn',
      group: 'sustainableAlternatives',
      title: 'Stop indoor wood/coal space heating; switch to sealed electric warmth',
      summary:
        'Replace open wood, coal, or charcoal braziers with layered thermal clothing, hot-water bottles, or an oil-filled electric radiator/heat pump.',
      rationale: 'Indoor solid-fuel burning causes fatal CO risk and massive neighborhood PM2.5 spikes.',
      costTier: profile.budgetTier === 'zero_cost' ? 'free' : 'investment',
      priority: 'critical',
      tags: ['heating', 'wood', 'safety'],
      applicableToVulnerable: true,
      impactActionId: 'replace_wood_heating_with_electric',
    });
  }

  // No waste burning & community action (universal)
  items.push({
    id: 'alt-community-no-waste-burning',
    group: 'sustainableAlternatives',
    title: 'Never burn dry leaves, trash, or winter bonfires—compost instead',
    summary:
      'Open burning of yard waste and plastics emits toxic dioxins and fine smoke directly at ground level. Bag leaves for municipal mulching or home compost.',
    rationale: 'Local trash/leaf fires are a major preventable driver of winter nighttime AQI spikes.',
    costTier: 'free',
    priority: 'high',
    tags: ['waste-burning', 'community'],
    applicableToVulnerable: true,
    impactActionId: 'stop_open_waste_burning',
  });

  items.push({
    id: 'alt-community-action-circle',
    group: 'sustainableAlternatives',
    title: 'Organize neighborhood anti-idling & shared AQI alert circles',
    summary:
      'Share daily AQI alerts with your apartment association or school parent group, request no-idling drop-off zones, and report illegal waste burning to local civic helplines.',
    rationale: 'Collective behavioral shifts multiply individual household impact across streets.',
    costTier: 'free',
    priority: 'medium',
    tags: ['community', 'advocacy'],
    applicableToVulnerable: true,
  });

  return items;
}

function buildSafetyPrecautions(
  band: AqiCategoryBand,
  profile: UserProfile,
): SafetyPrecaution[] {
  const precautions: SafetyPrecaution[] = [];
  const { hasChildren, hasElderly, hasRespiratoryCondition } = profile.household;
  const vulnerable = hasVulnerableMembers(profile);
  const isUnhealthy = getBandMetadata(band).isUnhealthy;

  if (band === 'Severe') {
    precautions.push({
      id: 'safety-severe-general',
      severity: 'emergency',
      title: 'Severe Smog Alert: Stay indoors and avoid physical exertion outdoors',
      guidance:
        'Cancel outdoor sports and strenuous chores. If stepping outside is unavoidable, wear a snug N95/FFP2 respirator (not a cloth or loose surgical mask).',
      targetGroups: ['All household members'],
    });
  } else if (band === 'Very Poor' || band === 'Poor') {
    precautions.push({
      id: 'safety-unhealthy-general',
      severity: 'warning',
      title: `${band} Air Quality: Limit prolonged outdoor exposure`,
      guidance:
        'Reduce time spent near busy roads and avoid outdoor cardio. Wear a well-fitted N95/FFP2 mask when commuting in traffic.',
      targetGroups: ['All household members'],
    });
  } else if (band === 'Moderate' && vulnerable) {
    precautions.push({
      id: 'safety-moderate-vulnerable',
      severity: 'advisory',
      title: 'Moderate AQI Advisory for Sensitive Household Members',
      guidance:
        'Healthy adults face low risk, but children, older adults, and people with asthma or heart disease should take breaks from vigorous outdoor exertion.',
      targetGroups: ['Sensitive household members'],
    });
  }

  if (hasChildren && (isUnhealthy || band === 'Moderate')) {
    precautions.push({
      id: 'safety-children',
      severity: band === 'Severe' ? 'emergency' : 'warning',
      title: 'Children: Shift play indoors and monitor breathing',
      guidance:
        'Children breathe faster per body weight and are closer to vehicle exhaust height. Keep outdoor recess short or indoors and watch for coughing or shortness of breath.',
      targetGroups: ['Children'],
    });
  }

  if (hasElderly && (isUnhealthy || band === 'Moderate')) {
    precautions.push({
      id: 'safety-elderly',
      severity: band === 'Severe' ? 'emergency' : 'warning',
      title: 'Older Adults: Guard against cardiopulmonary strain',
      guidance:
        'Fine particulates increase cardiovascular stress in older adults. Maintain indoor warmth with non-combustion clothing/heaters and monitor for fatigue, dizziness, or chest discomfort.',
      targetGroups: ['Older adults'],
    });
  }

  if (hasRespiratoryCondition && (isUnhealthy || band === 'Moderate' || band === 'Satisfactory')) {
    precautions.push({
      id: 'safety-respiratory',
      severity: isUnhealthy ? 'emergency' : 'advisory',
      title: 'Asthma / Respiratory Conditions: Keep action plan & reliever accessible',
      guidance:
        'Keep prescribed rescue inhalers or maintenance medications readily accessible, follow your clinician’s asthma/COPD action plan, and seek medical care promptly if wheezing or chest tightness worsens.',
      targetGroups: ['Individuals with asthma or respiratory conditions'],
    });
  }

  return precautions;
}

export function generateRecommendations(
  input: RecommendationInput,
): RecommendationPlan {
  const { band, trend, profile, now = new Date() } = input;

  return {
    band,
    trend,
    dailyRoutine: buildDailyRoutine(band, trend, profile),
    indoorHacks: buildIndoorHacks(band, trend, profile),
    sustainableAlternatives: buildSustainableAlternatives(band, profile),
    safetyPrecautions: buildSafetyPrecautions(band, profile),
    medicalDisclaimer: MEDICAL_DISCLAIMER,
    generatedAt: now.toISOString(),
  };
}
