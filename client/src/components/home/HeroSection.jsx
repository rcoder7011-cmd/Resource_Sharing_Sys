import React, { useEffect, useRef } from 'react';
import { ArrowRight, Compass, ShieldCheck, Cpu, FlaskConical } from 'lucide-react';
import gsap from 'gsap';
import Button from '../common/Button';

export default function HeroSection() {
  const heroRef = useRef(null);
  const headlineRef = useRef(null);
  const subtextRef = useRef(null);
  const ctaRef = useRef(null);
  const visualRef = useRef(null);

  useEffect(() => {
    // Respect reduced-motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.8 } });

      tl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, delay: 0.1 }
      )
        .fromTo(
          subtextRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0 },
          '-=0.4'
        )
        .fromTo(
          visualRef.current,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 1 },
          '-=0.6'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 dark:border-slate-900 bg-gradient-to-b from-slate-50 via-white to-slate-100/50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/50 transition-colors duration-200"
    >
      {/* Subtle background ambient gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-medium text-slate-800 dark:text-slate-300">
                Institutional Resource Governance
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-500 dark:text-slate-400">Labs, Makerspaces & Facilities</span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] transition-colors"
            >
              Make Better Use of What We Already Have.
            </h1>

            {/* Supporting Text */}
            <p
              ref={subtextRef}
              className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed transition-colors"
            >
              Discover and share trusted spaces, equipment, and technical resources through a transparent, accountable process.
            </p>

            {/* CTAs */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2"
            >
              <Button
                to="/resources"
                variant="primary"
                size="lg"
                icon={ArrowRight}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                Explore Resources
              </Button>
              <Button
                href="#how-it-works"
                variant="outline"
                size="lg"
                icon={Compass}
                className="w-full sm:w-auto"
              >
                How It Works
              </Button>
            </div>

            {/* Key trust badges */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-900 text-xs text-slate-600 dark:text-slate-400 transition-colors">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Custodian Approvals</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Verified Facilities</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Equipment Audit Trails</span>
              </div>
            </div>
          </div>

          {/* Right Visual Composition */}
          <div ref={visualRef} className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative border frame */}
              <div className="card-surface p-3.5 shadow-xl dark:shadow-2xl relative">
                {/* Main Featured Visual */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <img
                    src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1000&q=80"
                    alt="Precision laboratory electron microscope workstation"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                  {/* On-image contextual overlay */}
                  <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Nanotech Research Suite</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                        Active Custody Log
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Tier-2 Cleanroom • FE-SEM with EDX Elemental Analysis
                    </p>
                  </div>
                </div>

                {/* Floating Micro-Badge */}
                <div className="absolute -bottom-4 -left-4 sm:left-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl hidden sm:flex items-center gap-3 text-xs transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/15 dark:bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Safe Custody Check</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Condition logged at handoff</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
