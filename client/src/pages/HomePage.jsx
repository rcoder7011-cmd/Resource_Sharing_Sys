import React from 'react';
import HeroSection from '../components/home/HeroSection';
import ResourcePreview from '../components/home/ResourcePreview';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TrustSafetySection from '../components/home/TrustSafetySection';
import FairAccessSection from '../components/home/FairAccessSection';
import CtaSection from '../components/home/CtaSection';

export default function HomePage() {
  return (
    <div className="space-y-0">
      <HeroSection />
      <ResourcePreview />
      <HowItWorksSection />
      <TrustSafetySection />
      <FairAccessSection />
      <CtaSection />
    </div>
  );
}
