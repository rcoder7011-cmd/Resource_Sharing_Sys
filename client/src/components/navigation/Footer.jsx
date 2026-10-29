import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Shield, CheckCircle2, Lock } from 'lucide-react';
import { APP_NAME } from '../../utils/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Mission Statement */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Box className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-white">{APP_NAME}</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enabling universities, research labs, makerspaces, and community organizations to share underused spaces, tooling, and technical gear through transparent custody and accountable governance.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All Systems Verified & Operational</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Platform
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/resources" className="hover:text-white transition-colors">
                  Explore Catalog
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/#trust-safety" className="hover:text-white transition-colors">
                  Trust & Safety
                </Link>
              </li>
              <li>
                <Link to="/#fair-access" className="hover:text-white transition-colors">
                  Fair Access Principles
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Governance */}
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Governance
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Owner Approval Controls</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Prerequisite Safety Training</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Condition Check-in Logs</span>
              </li>
              <li className="text-slate-500 pt-1">
                Institutional policies apply to all resource loans.
              </li>
            </ul>
          </div>

          {/* Institutional Standards */}
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Standards & Integrity
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Collaborative custody management with conflict-free slot scheduling, verified condition audits, instant updates, and administrative moderation.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-medium text-slate-200">System Status: Active</span>
              </div>
              <p className="text-slate-400 text-[10px]">Verified multi-campus equipment sharing network.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {currentYear} {APP_NAME} — Resource Sharing Platform. All rights reserved.</p>
          <p className="text-slate-500">Built for educational & institutional collaboration</p>
        </div>
      </div>
    </footer>
  );
}
