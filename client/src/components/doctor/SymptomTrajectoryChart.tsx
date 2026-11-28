import React from 'react';
import { TrendingDown, Activity, Calendar } from 'lucide-react';
import { HealthUpdate, Consultation } from '../../types';

interface SymptomTrajectoryChartProps {
  baselineConsultation: Consultation | null;
  updates: HealthUpdate[];
}

export const SymptomTrajectoryChart: React.FC<SymptomTrajectoryChartProps> = ({
  baselineConsultation,
  updates,
}) => {
  if (!baselineConsultation && updates.length === 0) {
    return null;
  }

  // Calculate statistics
  let improvedCount = 0;
  let persistentCount = 0;
  let newCount = 0;

  updates.forEach((u) => {
    (u.structuredSummary?.symptoms || []).forEach((s) => {
      if (s.status === 'improved') improvedCount++;
      else if (s.status === 'persistent') persistentCount++;
      else if (s.status === 'new') newCount++;
    });
  });

  const totalEvaluated = improvedCount + persistentCount + newCount;
  const improvementRate = totalEvaluated > 0 ? Math.round((improvedCount / totalEvaluated) * 100) : 0;

  return (
    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
      {/* Title & Quick Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Longitudinal Symptom Trajectory
            </h4>
            <p className="text-[11px] text-slate-500">
              Patient progression tracked across {updates.length} confirmed voice updates
            </p>
          </div>
        </div>

        {totalEvaluated > 0 && (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              <TrendingDown className="w-3.5 h-3.5" />
              {improvementRate}% Symptom Improvement Rate
            </div>
          </div>
        )}
      </div>

      {/* Trajectory Breakdown Pills */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
            {improvedCount}
          </span>
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            Improved Symptoms
          </span>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl">
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 block">
            {persistentCount}
          </span>
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
            Persistent Symptoms
          </span>
        </div>
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl">
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 block">
            {newCount}
          </span>
          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
            Newly Emerged
          </span>
        </div>
      </div>

      {/* Visual Timeline Nodes */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Chronological Trajectory Milestones
        </span>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {baselineConsultation && (
            <div className="flex-shrink-0 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs w-48 space-y-1">
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold text-[10px] uppercase">
                <Calendar className="w-3 h-3" />
                Medical Baseline
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                {baselineConsultation.diagnosis || 'Initial Consultation'}
              </p>
              <p className="text-[10px] text-slate-500">
                {(baselineConsultation.baselineSymptoms || []).length} symptoms recorded
              </p>
            </div>
          )}

          {updates.map((update, index) => (
            <div
              key={update.id || index}
              className="flex-shrink-0 p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 rounded-2xl text-xs w-48 space-y-1"
            >
              <div className="flex items-center justify-between text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase">
                <span>Update #{updates.length - index}</span>
                <span className="text-[9px] text-slate-400">
                  {new Date(update.confirmedAt || update.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="space-y-0.5">
                {(update.structuredSummary?.symptoms || []).slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                      {s.symptom}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        s.status === 'improved'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700'
                          : s.status === 'persistent'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700'
                          : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
