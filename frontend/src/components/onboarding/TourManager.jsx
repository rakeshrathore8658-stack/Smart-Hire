import React from 'react';
import SpotlightOverlay from './SpotlightOverlay';
import TourTooltip from './TourTooltip';
import WelcomeTourModal from './WelcomeTourModal';
import TourCompletionModal from './TourCompletionModal';

export default function TourManager() {
  return (
    <>
      <SpotlightOverlay />
      <TourTooltip />
      <WelcomeTourModal />
      <TourCompletionModal />
    </>
  );
}
