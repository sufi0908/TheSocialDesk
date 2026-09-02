import React from 'react';
import { CalendarContentCard } from './CalendarContentCard';

/**
 * ScheduledContentCard
 * Re-exports the modern SaaS CalendarContentCard component for backwards compatibility.
 */
export const ScheduledContentCard = (props) => {
  return <CalendarContentCard {...props} />;
};

export { CalendarContentCard };
export default ScheduledContentCard;
