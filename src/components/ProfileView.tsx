import React, { useState } from 'react';
import { CheckCircle2, UserCheck, Sliders } from 'lucide-react';
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
    <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              {t.profileTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.profileSubtitle}
            </p>
          </div>
        </div>

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">{t.profileSavedSuccess}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="locationQuery" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.locationLabel}
              </label>
              <input
                id="locationQuery"
                type="text"
                value={formState.locationQuery}
                onChange={(e) => setFormState({ ...formState, locationQuery: e.target.value })}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="householdSize" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
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
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Vulnerable Household Members
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasChildren}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasChildren: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.hasChildrenLabel}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasElderly}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasElderly: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.hasElderlyLabel}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.household.hasRespiratoryCondition}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      household: { ...formState.household, hasRespiratoryCondition: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.hasRespiratoryCondition}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="commuteMode" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.commuteModeLabel}
              </label>
              <select
                id="commuteMode"
                value={formState.commuteMode}
                onChange={(e) => setFormState({ ...formState, commuteMode: e.target.value as CommuteMode })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label htmlFor="commuteDistance" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.commuteDistanceLabel}
              </label>
              <input
                id="commuteDistance"
                type="number"
                min={0}
                max={200}
                value={formState.commuteDistanceKmOneWay}
                onChange={(e) => setFormState({ ...formState, commuteDistanceKmOneWay: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="commuteDays" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.commuteDaysLabel}
              </label>
              <input
                id="commuteDays"
                type="number"
                min={0}
                max={7}
                value={formState.commuteDaysPerWeek}
                onChange={(e) => setFormState({ ...formState, commuteDaysPerWeek: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cookingFuel" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.cookingFuelLabel}
              </label>
              <select
                id="cookingFuel"
                value={formState.cookingFuel}
                onChange={(e) => setFormState({ ...formState, cookingFuel: e.target.value as CookingFuel })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lpg">LPG Cylinder / Gas</option>
                <option value="electric_induction">Electric Induction</option>
                <option value="piped_gas">Piped Natural Gas (PNG)</option>
                <option value="biomass_wood">Biomass / Wood / Dung</option>
                <option value="coal_kerosene">Coal / Kerosene</option>
              </select>
            </div>

            <div>
              <label htmlFor="heatingSource" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.heatingSourceLabel}
              </label>
              <select
                id="heatingSource"
                value={formState.heatingSource}
                onChange={(e) => setFormState({ ...formState, heatingSource: e.target.value as HeatingSource })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="homeType" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.homeTypeLabel}
              </label>
              <select
                id="homeType"
                value={formState.homeType}
                onChange={(e) => setFormState({ ...formState, homeType: e.target.value as HomeType })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="apartment">Apartment / High-rise</option>
                <option value="independent_house">Independent House / Villa</option>
                <option value="semi_detached">Semi-Detached / Row House</option>
                <option value="shared_room">Shared Room / Hostel</option>
              </select>
            </div>

            <div>
              <label htmlFor="budgetTier" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t.budgetTierLabel}
              </label>
              <select
                id="budgetTier"
                value={formState.budgetTier}
                onChange={(e) => setFormState({ ...formState, budgetTier: e.target.value as BudgetTier })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="zero_cost">Zero Cost (Free DIY &amp; Timing)</option>
                <option value="low_cost">Low Cost (Weatherstripping &amp; DIY Box Fan)</option>
                <option value="moderate_investment">Moderate Investment (HEPA Purifier &amp; Upgrades)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Sliders className="w-5 h-5" aria-hidden="true" />
              <span>{t.saveProfile}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
