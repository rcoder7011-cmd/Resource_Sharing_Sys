import React, { useState } from 'react';
import { ArrowRight, HelpCircle, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';

export default function CtaSection() {
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  return (
    <>
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-surface p-8 sm:p-14 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors duration-200">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative max-w-2xl space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight transition-colors">
              Ready to Share or Access Specialized Equipment?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed transition-colors">
              Explore available scientific apparatus, computational nodes, and makerspaces, or learn how your department can onboard unused facilities safely.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
              <Button
                to="/resources"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                Browse All Resources
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                icon={HelpCircle}
                onClick={() => setPartnerModalOpen(true)}
                className="w-full sm:w-auto"
              >
                How to List a Resource
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Resource Listing Inquiry Modal */}
      <Modal
        isOpen={partnerModalOpen}
        onClose={() => setPartnerModalOpen(false)}
        title="Departmental Resource Listing"
      >
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed">
            Interested in adding your laboratory or workshop to the platform?
          </p>
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Listing Requirements:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Designated faculty or staff equipment custodian</li>
              <li>Established maintenance and calibration protocol</li>
              <li>Standard operating procedures (SOP) and safety training module</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered faculty and lab managers can list new equipment directly from the member dashboard.
          </p>
          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setPartnerModalOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
