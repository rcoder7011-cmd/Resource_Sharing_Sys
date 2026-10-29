import React from 'react';
import { Clock, Users, BarChart3, AlertCircle } from 'lucide-react';

export default function FairAccessSection() {
  const principles = [
    {
      title: 'Booking Caps & Duration Limits',
      description:
        'To prevent single users or labs from monopolizing scarce apparatus, maximum session lengths (e.g. 4 hours per day) and weekly quotas are enforced automatically.',
      icon: Clock,
    },
    {
      title: 'Transparent Waiting Lists',
      description:
        'When popular slots are reserved, users can join an orderly queue. Cancellations immediately notify the next in line without favoritism.',
      icon: Users,
    },
    {
      title: 'Audited Quota Allocation',
      description:
        'Department chairs and facility administrators have clear visibility into booking distributions, ensuring fair cross-departmental access.',
      icon: BarChart3,
    },
  ];

  return (
    <section id="fair-access" className="py-20 bg-slate-900/30 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <span>Fair Allocation Standards</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Fair Access for Every Researcher & Student
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            High-demand resources like electron microscopes, wind tunnels, and GPU clusters must be shared equitably. Here is how our allocation guidelines prevent hoarding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principles.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="card-surface p-6 rounded-2xl border border-slate-800 space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 mb-2">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Informational Callout */}
        <div className="mt-8 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p>
            <strong>Institutional Policy:</strong> Fair access policies ensure equitable availability across academic departments, interdisciplinary research groups, and student innovation teams.
          </p>
        </div>
      </div>
    </section>
  );
}
