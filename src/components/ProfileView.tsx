import React, { useState } from 'react';
import { CheckCircle2, Sliders } from 'lucide-react';
import { translations, type Language } from '../i18n/translations';
import type {
  BudgetTier,
  CommuteMode,
  CookingFuel,
  HeatingSource,
  HomeType,
  UserProfile,
} from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  language: Language;
}

const inputClasses =
  'w-full px-3.5 py-2.5 bg-[#F4F7F6] dark:bg-[#162228] border border-[#D5DFDC] dark:border-[#22323A] rounded-xl text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 transition';

const labelClasses = 'block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5';

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  language,
}) => {
  const t = translations[language];
  const [formState, setFormState] = useState<UserProfile>(profile);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formState);
    setSuccessMessage(true);
    setTimeout(() => setSuccessMessage(false), 4000);
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 focus:outline-none"
    >
      <div className="bg-white dark:bg-[#111A1E] rounded-2xl p-6 sm:p-8 shadow-sm border border-[#D5DFDC] dark:border-[#22323A] space-y-6">
        <div className="pb-5 border-b border-[#D5DFDC] dark:border-[#22323A] space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            Local Device Storage · Zero Account Required
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t.profileTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t.profileSubtitle}
          </p>
        </div>

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 p-4 rounded-xl flex items-center gap-3 text-emerald-900 dark:text-emerald-200"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">{t.profileSavedSuccess}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="locationQuery" className={labelClasses}>
                {t.locationLabel}
              </label>
              <input
                id="locationQuery"
                type="text"
                value={formState.locationQuery}
                onChange={(e) => setFormState({ ...formState, locationQuery: e.target.value })}
                required
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="householdSize" className={labelClasses}>
                {t.householdSizeLabel}
              </label>
              <input
                id="householdSize"
                type="number"
                min={1}
                max={20}
                value={formState.household.householdSize}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    household: { ...formState.household, householdSize: parseInt(e.target.value, 10) || 1 },
                  })
                }
                required
                className={`${inputClasses} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="pt-5 border-t border-[#D5DFDC] dark:border-[#22323A] space-y-3">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Vulnerable Household Members
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#ECF1EF] dark:bg-[#162228] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasChildren}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasChildren: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-teal-700 dark:accent-teal-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.hasChildrenLabel}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#ECF1EF] dark:bg-[#162228] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasElderly}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasElderly: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-teal-700 dark:accent-teal-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.hasElderlyLabel}</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-[#ECF1EF] dark:bg-[#162228] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasRespiratoryCondition}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasRespiratoryCondition: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-teal-700 dark:accent-teal-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.hasRespiratoryCondition}</span>
              </label>
            </div>
          </div>

          <div className="pt-5 border-t border-[#D5DFDC] dark:border-[#22323A] grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="commuteMode" className={labelClasses}>
                {t.commuteModeLabel}
              </label>
              <select
                id="commuteMode"
                value={formState.commuteMode}
                onChange={(e) => setFormState({ ...formState, commuteMode: e.target.value as CommuteMode })}
                className={inputClasses}
              >
                <option value="car_petrol">Car (Petrol)</option>
                <option value="car_diesel">Car (Diesel)</option>
                <option value="motorcycle">Motorcycle / Scooter</option>
                <option value="public_transit">Public Transit (Bus / Metro)</option>
                <option value="carpool">Carpool</option>
                <option value="bicycle">Bicycle</option>
                <option value="walk">Walk</option>
                <option value="work_from_home">Work from Home / Remote</option>
              </select>
            </div>

            <div>
              <label htmlFor="commuteDistance" className={labelClasses}>
                {t.commuteDistanceLabel}
              </label>
              <input
                id="commuteDistance"
                type="number"
                min={0}
                max={200}
                value={formState.commuteDistanceKmOneWay}
                onChange={(e) => setFormState({ ...formState, commuteDistanceKmOneWay: parseFloat(e.target.value) || 0 })}
                className={`${inputClasses} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="commuteDays" className={labelClasses}>
                {t.commuteDaysLabel}
              </label>
              <input
                id="commuteDays"
                type="number"
                min={0}
                max={7}
                value={formState.commuteDaysPerWeek}
                onChange={(e) => setFormState({ ...formState, commuteDaysPerWeek: parseInt(e.target.value, 10) || 0 })}
                className={`${inputClasses} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="cookingFuel" className={labelClasses}>
                {t.cookingFuelLabel}
              </label>
              <select
                id="cookingFuel"
                value={formState.cookingFuel}
                onChange={(e) => setFormState({ ...formState, cookingFuel: e.target.value as CookingFuel })}
                className={inputClasses}
              >
                <option value="lpg">LPG Cylinder / Gas</option>
                <option value="electric_induction">Electric Induction</option>
                <option value="piped_gas">Piped Natural Gas (PNG)</option>
                <option value="biomass_wood">Biomass / Wood / Dung</option>
                <option value="coal_kerosene">Coal / Kerosene</option>
              </select>
            </div>

            <div>
              <label htmlFor="heatingSource" className={labelClasses}>
                {t.heatingSourceLabel}
              </label>
              <select
                id="heatingSource"
                value={formState.heatingSource}
                onChange={(e) => setFormState({ ...formState, heatingSource: e.target.value as HeatingSource })}
                className={inputClasses}
              >
                <option value="none">None / Not Needed</option>
                <option value="electric_heater">Electric Heater / Radiator</option>
                <option value="heat_pump">Inverter Heat Pump / AC</option>
                <option value="gas_heater">Gas Heater</option>
                <option value="wood_biomass">Wood / Biomass Stove</option>
                <option value="coal_charcoal">Coal / Charcoal Brazier</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="homeType" className={labelClasses}>
                {t.homeTypeLabel}
              </label>
              <select
                id="homeType"
                value={formState.homeType}
                onChange={(e) => setFormState({ ...formState, homeType: e.target.value as HomeType })}
                className={inputClasses}
              >
                <option value="apartment">Apartment / High-rise</option>
                <option value="independent_house">Independent House / Villa</option>
                <option value="semi_detached">Semi-Detached / Row House</option>
                <option value="shared_room">Shared Room / Hostel</option>
              </select>
            </div>

            <div>
              <label htmlFor="budgetTier" className={labelClasses}>
                {t.budgetTierLabel}
              </label>
              <select
                id="budgetTier"
                value={formState.budgetTier}
                onChange={(e) => setFormState({ ...formState, budgetTier: e.target.value as BudgetTier })}
                className={inputClasses}
              >
                <option value="zero_cost">Zero Cost (Free DIY &amp; Timing)</option>
                <option value="low_cost">Low Cost (Weatherstripping &amp; DIY Box Fan)</option>
                <option value="moderate_investment">Moderate Investment (HEPA Purifier &amp; Upgrades)</option>
              </select>
            </div>
          </div>

          <div className="pt-5 border-t border-[#D5DFDC] dark:border-[#22323A] flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-xl whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111A1E]"
            >
              <Sliders className="w-4 h-4" aria-hidden="true" />
              <span>{t.saveProfile}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
