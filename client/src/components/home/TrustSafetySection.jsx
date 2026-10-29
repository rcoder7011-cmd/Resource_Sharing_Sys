import React from 'react';
import { ShieldCheck, UserCheck, ClipboardCheck, History, Scale } from 'lucide-react';

export default function TrustSafetySection() {
  const safetyPillars = [
    {
      title: 'Owner-Controlled Approvals',
      description:
        'Equipment custodians retain absolute authority over who uses their instruments, when access occurs, and which research activities are authorized.',
      icon: UserCheck,
      color: 'blue',
    },
    {
      title: 'Mandatory Eligibility & Training',
      description:
        'Booking requests are gated by prerequisite training tiers, ensuring only certified operators can turn on sensitive equipment or use cleanrooms.',
      icon: ShieldCheck,
      color: 'emerald',
    },
    {
      title: 'Strict Condition Documentation',
      description:
        'Digital custody transfers require sign-off checklists before and after every booking to log physical wear, consumables, and calibration states.',
      icon: ClipboardCheck,
      color: 'purple',
    },
    {
      title: 'Transparent Custody History',
      description:
        'Every booking creates an immutable timeline of usage, maintenance cycles, and operator logs accessible to department chairs and lab managers.',
      icon: History,
      color: 'amber',
    },
    {
      title: 'Equitable Access Standards',
      description:
        'Monopoly prevention rules ensure no single laboratory or research group can lock out community peers from scarce institutional assets.',
      icon: Scale,
      color: 'teal',
    },
  ];

  return (
    <section id="trust-safety" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Heading & Context */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trust & Governance Framework</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Built for High-Value, Sensitive Institutional Assets.
          </h2>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Resource sharing only works when asset owners trust the system. ShareCore replaces informal, ad-hoc equipment loans with enforceable institutional safeguards.
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-200">
              Institutional Accountability Statement:
            </p>
            <p className="leading-relaxed">
              All bookings adhere to host department safety guidelines and institutional property regulations. Failure to follow safety protocols results in immediate loan revocation.
            </p>
          </div>
        </div>

        {/* Right Column: 5 Pillars Cards */}
        <div className="lg:col-span-7 space-y-4">
          {safetyPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="card-surface p-5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0 text-blue-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
