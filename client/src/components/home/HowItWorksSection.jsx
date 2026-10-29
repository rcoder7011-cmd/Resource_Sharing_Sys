import React from 'react';
import {
  Search,
  FileCheck2,
  CalendarCheck,
  UserCheck,
  QrCode,
  RotateCcw,
} from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Discover a Resource',
      description:
        'Search our centralized inventory of spaces, specialized testing rigs, and fabrication tools across departments and affiliated campuses.',
      icon: Search,
      highlight: 'Transparent catalog',
    },
    {
      number: '02',
      title: 'Check Access Requirements',
      description:
        'Verify prerequisite safety training, required supervision tiers, and institutional affiliations needed for the resource.',
      icon: FileCheck2,
      highlight: 'Clear prerequisites',
    },
    {
      number: '03',
      title: 'Request a Booking',
      description:
        'Select preferred dates, specify research or operational justification, and submit booking requests with required documentation.',
      icon: CalendarCheck,
      highlight: 'Quota-fair booking',
    },
    {
      number: '04',
      title: 'Get Owner Approval',
      description:
        'Facility directors and equipment custodians review applications, verify certifications, and approve access schedules.',
      icon: UserCheck,
      highlight: 'Custodian-approved',
    },
    {
      number: '05',
      title: 'Check In & Use Resource',
      description:
        'Arrive at the facility, verify equipment condition alongside the on-duty technician, and log operating hours.',
      icon: QrCode,
      highlight: 'Custody verification',
    },
    {
      number: '06',
      title: 'Return & Log Condition',
      description:
        'Complete the clean-up checklist, log specimen count or machine runtime, and record returned condition in the audit ledger.',
      icon: RotateCcw,
      highlight: 'Accountable audit',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>6-Step Governance Lifecycle</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
            How Institutional Resource Sharing Works
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
            A structured, accountable process that protects high-value assets while providing equitable access for students, researchers, and community innovators.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="card-surface p-6 rounded-2xl relative flex flex-col justify-between border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-mono font-bold text-slate-400 dark:text-slate-600">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                    {step.description}
                  </p>
                </div>

                {/* Highlight Tag */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Core standard:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-300">{step.highlight}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
