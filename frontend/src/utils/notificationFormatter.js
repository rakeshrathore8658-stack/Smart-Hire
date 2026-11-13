/**
 * SmartHire Notification Formatter & Beautifier
 * Normalizes legacy, raw, and dynamic notification objects into human-readable,
 * expressive, and action-oriented content with custom icons, badge colors, and titles.
 */

export const formatNotificationDisplay = (notif = {}) => {
  const actionType = notif.actionType || '';
  const type = notif.type || '';
  let rawTitle = notif.title || '';
  let rawMessage = notif.message || '';
  const currentStatus = notif.currentStatus || '';
  const candName = notif.candidateName || 'Candidate';
  const role = notif.jobTitle || 'Applied Position';

  let title = rawTitle;
  let message = rawMessage;
  let badge = {
    text: 'STATUS UPDATE',
    bg: 'rgba(59, 130, 246, 0.14)',
    color: '#2563eb',
    icon: 'bi-bell-fill',
    badgeClass: 'badge-primary',
  };
  let heading = 'Application Notification';
  let actionPerformed = 'Application status updated in recruitment workflow';

  // 1. Shortlist Added
  if (
    actionType === 'SHORTLIST_ADDED' ||
    (rawTitle.includes('Shortlist') && !rawTitle.includes('Updated') && !rawTitle.includes('Removed') && !rawTitle.includes('Status')) ||
    (rawTitle.includes('Shortlisted') && !rawTitle.includes('Removed'))
  ) {
    title = rawTitle.includes('Congratulations') ? rawTitle : `Congratulations! Shortlisted for ${role} ⭐`;
    heading = 'Application Shortlisted ⭐';
    actionPerformed = 'Candidate shortlisted for technical interview evaluation';
    badge = {
      text: 'SHORTLISTED',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      icon: 'bi-star-fill',
      badgeClass: 'badge-success',
    };
    if (!message || message.includes('has been updated')) {
      message = `Hello ${candName}, congratulations! Your profile for '${role}' has been shortlisted by the recruitment team. You have successfully advanced to the interview evaluation stage.`;
    }
  }

  // 2. Shortlist Removed (explicit or legacy "Shortlist Status Updated")
  else if (
    actionType === 'SHORTLIST_REMOVED' ||
    rawTitle === 'Shortlist Status Updated' ||
    rawTitle.includes('Removed from Shortlist') ||
    (rawMessage.includes('your shortlist status') && rawMessage.includes('updated by the recruitment team'))
  ) {
    title = `Application Status: Removed from Shortlist (${role})`;
    heading = 'Removed from Shortlist';
    actionPerformed = 'Candidate profile moved from Shortlist back to Under Review';
    badge = {
      text: 'UNDER REVIEW',
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      icon: 'bi-dash-circle-fill',
      badgeClass: 'badge-warning',
    };
    if (!message || message.includes('updated by the recruitment team') && !message.includes('Under Review')) {
      message = `Hello ${candName}, your application for '${role}' has been moved from the Shortlist back to 'Under Review' by the recruitment team. Our hiring panel is reviewing additional vacancy openings and will notify you if your profile is selected for interview rounds.`;
    }
  }

  // 3. Interview Cancelled
  else if (actionType === 'INTERVIEW_CANCELLED' || rawTitle.toLowerCase().includes('cancelled') || rawMessage.toLowerCase().includes('interview has been cancelled')) {
    title = rawTitle.includes('Cancelled') ? rawTitle : `Interview Cancelled: ${role}`;
    heading = 'Interview Cancelled';
    actionPerformed = 'Scheduled interview round cancelled by recruitment team';
    badge = {
      text: 'CANCELLED',
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      icon: 'bi-calendar-x-fill',
      badgeClass: 'badge-danger',
    };
    if (!message) {
      message = `Hello ${candName}, your scheduled interview for '${role}' has been cancelled by the recruitment team. Your profile remains active under candidate review.`;
    }
  }

  // 4. Interview Rescheduled
  else if (actionType === 'INTERVIEW_RESCHEDULED' || rawTitle.toLowerCase().includes('rescheduled') || rawMessage.toLowerCase().includes('rescheduled')) {
    title = rawTitle.includes('Rescheduled') ? rawTitle : `Interview Rescheduled: ${role}`;
    heading = 'Interview Rescheduled';
    actionPerformed = 'Interview session rescheduled to an updated calendar slot';
    badge = {
      text: 'RESCHEDULED',
      bg: 'rgba(14, 165, 233, 0.15)',
      color: '#0284c7',
      icon: 'bi-calendar-range-fill',
      badgeClass: 'badge-primary',
    };
  }

  // 5. Interview Scheduled
  else if (
    actionType === 'INTERVIEW_SCHEDULED' ||
    type === 'INTERVIEW' ||
    rawTitle.toLowerCase().includes('interview scheduled') ||
    rawMessage.toLowerCase().includes('interview has been confirmed')
  ) {
    title = rawTitle.includes('Interview') ? rawTitle : `Interview Scheduled: ${role}`;
    heading = 'Interview Scheduled';
    actionPerformed = 'Technical / HR interview session confirmed and scheduled';
    badge = {
      text: 'INTERVIEWING',
      bg: 'rgba(139, 92, 246, 0.15)',
      color: '#8b5cf6',
      icon: 'bi-calendar2-check-fill',
      badgeClass: 'badge-primary',
    };
  }

  // 6. Interview Feedback / Evaluation
  else if (
    actionType === 'INTERVIEW_FEEDBACK' ||
    type === 'FEEDBACK' ||
    rawTitle.toLowerCase().includes('feedback') ||
    rawTitle.toLowerCase().includes('evaluation') ||
    rawTitle.toLowerCase().includes('next round')
  ) {
    title = rawTitle || `Interview Feedback: ${role}`;
    heading = 'Interview Feedback & Evaluation';
    actionPerformed = 'Hiring panel submitted structured evaluation feedback';
    badge = {
      text: 'FEEDBACK RECORDED',
      bg: 'rgba(14, 165, 233, 0.15)',
      color: '#0ea5e9',
      icon: 'bi-clipboard-data-fill',
      badgeClass: 'badge-info',
    };
  }

  // 7. Stage: Offered
  else if (
    actionType === 'STAGE_OFFERED' ||
    currentStatus.toLowerCase() === 'offered' ||
    rawTitle.toLowerCase().includes('job offer') ||
    rawMessage.toLowerCase().includes('job offer')
  ) {
    title = rawTitle.includes('Job Offer') ? rawTitle : `🎉 Job Offer Extended: ${role}`;
    heading = 'Job Offer Extended 🎉';
    actionPerformed = 'Formal employment offer extended by recruitment team';
    badge = {
      text: 'OFFER EXTENDED',
      bg: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      icon: 'bi-trophy-fill',
      badgeClass: 'badge-success',
    };
  }

  // 8. Stage: Hired
  else if (
    actionType === 'STAGE_HIRED' ||
    currentStatus.toLowerCase() === 'hired' ||
    rawTitle.toLowerCase().includes('welcome aboard') ||
    rawTitle.toLowerCase().includes('hired')
  ) {
    title = rawTitle.includes('Hired') ? rawTitle : `🎊 Welcome Aboard! Hired as ${role}`;
    heading = 'Officially Hired 🚀';
    actionPerformed = 'Candidate hired and onboarding workflow initiated';
    badge = {
      text: 'HIRED',
      bg: 'rgba(5, 150, 105, 0.15)',
      color: '#059669',
      icon: 'bi-patch-check-fill',
      badgeClass: 'badge-success',
    };
  }

  // 9. Stage: Rejected
  else if (
    actionType === 'STAGE_REJECTED' ||
    currentStatus.toLowerCase() === 'rejected' ||
    rawTitle.toLowerCase().includes('status update: ') ||
    rawMessage.toLowerCase().includes('will not be moving forward')
  ) {
    title = `Application Status Update: ${role}`;
    heading = 'Application Concluded';
    actionPerformed = 'Recruitment process concluded for current vacancy';
    badge = {
      text: 'NOT SELECTED',
      bg: 'rgba(100, 116, 139, 0.15)',
      color: '#64748b',
      icon: 'bi-archive-fill',
      badgeClass: 'badge-neutral',
    };
  }

  // 10. Stage: Under Review (explicit or legacy "updated to Under Review")
  else if (
    actionType === 'STAGE_UNDER_REVIEW' ||
    currentStatus.toLowerCase() === 'under review' ||
    rawTitle.toLowerCase().includes('under review') ||
    rawMessage.toLowerCase().includes('updated to under review')
  ) {
    title = `Application Under Review: ${role}`;
    heading = 'Application Under Review';
    actionPerformed = 'Candidate resume and profile under active hiring review';
    badge = {
      text: 'UNDER REVIEW',
      bg: 'rgba(59, 130, 246, 0.14)',
      color: '#2563eb',
      icon: 'bi-hourglass-split',
      badgeClass: 'badge-info',
    };
    if (!message || message.includes('Please check your application details')) {
      message = `Hello ${candName}, your application for '${role}' is currently under active review by the recruitment team. We are matching your profile with team requirements and will update you shortly.`;
    }
  }

  // 11. Stage: Interviewing (legacy "updated to Interviewing")
  else if (
    actionType === 'STAGE_INTERVIEWING' ||
    currentStatus.toLowerCase() === 'interviewing' ||
    rawTitle.toLowerCase().includes('interview stage') ||
    rawMessage.toLowerCase().includes('updated to interviewing')
  ) {
    title = `Application Advanced to Interview Stage: ${role}`;
    heading = 'Interview Stage Active';
    actionPerformed = 'Application advanced to interview evaluation';
    badge = {
      text: 'INTERVIEW PROCESS',
      bg: 'rgba(139, 92, 246, 0.14)',
      color: '#7c3aed',
      icon: 'bi-person-video2',
      badgeClass: 'badge-primary',
    };
    if (!message || message.includes('Please check your application details')) {
      message = `Hello ${candName}, great news! Your application for '${role}' has officially moved to the Interviewing stage. Our recruitment team will coordinate with you regarding the upcoming interview schedule.`;
    }
  }

  // 12. Application Removed / Recently Deleted
  else if (
    actionType === 'APPLICATION_REMOVED' ||
    actionType === 'APPLICATION_DELETED' ||
    actionType === 'CANDIDATE_ARCHIVED' ||
    rawTitle.includes('Removed') ||
    rawTitle.includes('Archival') ||
    rawMessage.toLowerCase().includes('removed from active') ||
    rawMessage.toLowerCase().includes('recently deleted')
  ) {
    title = rawTitle.includes('Removed') ? rawTitle : `Application Removed from Active Review: ${role}`;
    heading = 'Application Removed from Active Pool';
    actionPerformed = 'Candidate profile removed from active review and placed in recently deleted';
    badge = {
      text: 'RECENTLY DELETED',
      bg: 'rgba(239, 68, 68, 0.14)',
      color: '#ef4444',
      icon: 'bi-trash3-fill',
      badgeClass: 'badge-danger',
    };
    if (!message || message.includes('archived by HR Recruiter') || message.includes('Application Archival')) {
      message = `Hello ${candName}, your application for '${role}' has been removed from active recruitment review by the HR team and placed in recently deleted. If you have questions regarding this update, please contact recruitment support.`;
    }
  }

  // 13. Job Posting
  else if (type === 'JOB_POSTING' || actionType === 'JOB_PUBLISHED') {
    title = rawTitle || `New Opening: ${role}`;
    heading = 'New Job Opportunity Available';
    actionPerformed = 'New career vacancy published on SmartHire';
    badge = {
      text: 'NEW OPENING',
      bg: 'rgba(99, 102, 241, 0.14)',
      color: '#6366f1',
      icon: 'bi-briefcase-fill',
      badgeClass: 'badge-info',
    };
  }

  // 14. Bulk Screening
  else if (type === 'BULK_UPLOAD' || actionType === 'BULK_ANALYSIS_COMPLETED') {
    title = rawTitle || 'Bulk Resume Screening Completed';
    heading = 'Batch Screening Finished';
    actionPerformed = 'Batch AI candidate screening completed';
    badge = {
      text: 'BULK SCREENING',
      bg: 'rgba(255, 121, 0, 0.14)',
      color: '#ff7900',
      icon: 'bi-cloud-check-fill',
      badgeClass: 'badge-primary',
    };
  }

  // Fallback cleanup if title was generic "Application Status Updated"
  if (title === 'Application Status Updated') {
    title = `Application Status Update: ${role}`;
  }

  return {
    title,
    message,
    heading,
    actionPerformed,
    badge,
  };
};
