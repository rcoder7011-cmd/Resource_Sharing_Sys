import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="py-24 max-w-xl mx-auto px-4 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mx-auto">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-white tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-400 leading-relaxed">
        The requested URL was not found on this platform. Use the navigation links above or return to the home page.
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Button to="/" variant="primary" icon={ArrowLeft}>
          Return Home
        </Button>
        <Button to="/resources" variant="outline">
          Explore Catalog
        </Button>
      </div>
    </div>
  );
}
