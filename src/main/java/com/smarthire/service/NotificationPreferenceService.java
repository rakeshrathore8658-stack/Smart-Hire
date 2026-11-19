package com.smarthire.service;

import com.smarthire.dto.HrNotificationPreferenceDTO;
import com.smarthire.dto.HrPersonalNotificationPreferenceDTO;
import com.smarthire.entity.HrNotificationPreference;
import com.smarthire.entity.HrPersonalNotificationPreference;
import com.smarthire.entity.NotificationEventType;
import com.smarthire.repository.HrNotificationPreferenceRepository;
import com.smarthire.repository.HrPersonalNotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationPreferenceService {

    private final HrNotificationPreferenceRepository preferenceRepository;
    private final HrPersonalNotificationPreferenceRepository personalPreferenceRepository;

    public static final List<NotificationEventType> CANDIDATE_EVENTS = List.of(
            NotificationEventType.NEW_APPLICATION_RECEIVED,
            NotificationEventType.CANDIDATE_SHORTLISTED,
            NotificationEventType.REMOVED_FROM_SHORTLIST,
            NotificationEventType.CANDIDATE_REJECTED,
            NotificationEventType.INTERVIEW_SCHEDULED,
            NotificationEventType.INTERVIEW_CANCELLED,
            NotificationEventType.INTERVIEW_FEEDBACK,
            NotificationEventType.CANDIDATE_HIRED
    );

    public static final List<NotificationEventType> PERSONAL_EVENTS = List.of(
            NotificationEventType.NEW_APPLICATION_RECEIVED,
            NotificationEventType.RESUME_SCAN_COMPLETED,
            NotificationEventType.INTERVIEW_CONFIRMED
    );

    public static final Map<NotificationEventType, String> CANDIDATE_EVENT_LABELS = Map.of(
            NotificationEventType.NEW_APPLICATION_RECEIVED, "Application Received",
            NotificationEventType.CANDIDATE_SHORTLISTED, "Candidate Shortlisted",
            NotificationEventType.REMOVED_FROM_SHORTLIST, "Removed From Shortlist",
            NotificationEventType.CANDIDATE_REJECTED, "Candidate Rejected",
            NotificationEventType.INTERVIEW_SCHEDULED, "Interview Scheduled",
            NotificationEventType.INTERVIEW_CANCELLED, "Interview Cancelled",
            NotificationEventType.INTERVIEW_FEEDBACK, "Interview Feedback",
            NotificationEventType.CANDIDATE_HIRED, "Candidate Hired"
    );

    public static final Map<NotificationEventType, String> CANDIDATE_EVENT_DESCRIPTIONS = Map.of(
            NotificationEventType.NEW_APPLICATION_RECEIVED, "When candidate submits job application and pre-screening questionnaire.",
            NotificationEventType.CANDIDATE_SHORTLISTED, "When candidate qualifies screening and is added to shortlist.",
            NotificationEventType.REMOVED_FROM_SHORTLIST, "When candidate is removed from shortlisted talent pool.",
            NotificationEventType.CANDIDATE_REJECTED, "When candidate application is marked as rejected or disqualified.",
            NotificationEventType.INTERVIEW_SCHEDULED, "When a technical or HR interview date, time, and link are set.",
            NotificationEventType.INTERVIEW_CANCELLED, "When a scheduled interview session is cancelled.",
            NotificationEventType.INTERVIEW_FEEDBACK, "When interviewer evaluation notes and ratings are published.",
            NotificationEventType.CANDIDATE_HIRED, "When candidate successfully receives an offer and is marked hired."
    );

    public static final Map<NotificationEventType, String> EVENT_LABELS = Map.of(
            NotificationEventType.CANDIDATE_SHORTLISTED, "Candidate Shortlisted",
            NotificationEventType.REMOVED_FROM_SHORTLIST, "Removed From Shortlist",
            NotificationEventType.CANDIDATE_REJECTED, "Candidate Rejected",
            NotificationEventType.INTERVIEW_SCHEDULED, "Interview Scheduled",
            NotificationEventType.INTERVIEW_CANCELLED, "Interview Cancelled",
            NotificationEventType.INTERVIEW_FEEDBACK, "Interview Feedback",
            NotificationEventType.CANDIDATE_HIRED, "Candidate Hired",
            NotificationEventType.NEW_APPLICATION_RECEIVED, "New Candidate Application",
            NotificationEventType.RESUME_SCAN_COMPLETED, "ATS Resume Scan Completed",
            NotificationEventType.INTERVIEW_CONFIRMED, "Interview Confirmed by Candidate"
    );

    public static final Map<NotificationEventType, String> EVENT_DESCRIPTIONS = Map.of(
            NotificationEventType.CANDIDATE_SHORTLISTED, "When candidate qualifies screening and is added to shortlist.",
            NotificationEventType.REMOVED_FROM_SHORTLIST, "When candidate is removed from shortlisted talent pool.",
            NotificationEventType.CANDIDATE_REJECTED, "When candidate application is marked as rejected or disqualified.",
            NotificationEventType.INTERVIEW_SCHEDULED, "When a technical or HR interview date, time, and link are set.",
            NotificationEventType.INTERVIEW_CANCELLED, "When a scheduled interview session is cancelled.",
            NotificationEventType.INTERVIEW_FEEDBACK, "When interviewer evaluation notes and ratings are published.",
            NotificationEventType.CANDIDATE_HIRED, "When candidate successfully receives an offer and is marked hired.",
            NotificationEventType.NEW_APPLICATION_RECEIVED, "Alert HR when a candidate submits an application for your job posting.",
            NotificationEventType.RESUME_SCAN_COMPLETED, "Alert HR when AI resume analysis completes with match score.",
            NotificationEventType.INTERVIEW_CONFIRMED, "Alert HR when a candidate confirms or accepts an interview invitation."
    );

    /**
     * Retrieves full candidate preferences for the specified HR user ID.
     */
    @Transactional(readOnly = true)
    public List<HrNotificationPreferenceDTO> getPreferencesForHr(Long hrUserId) {
        if (hrUserId == null) {
            return getDefaultPreferences();
        }

        List<HrNotificationPreference> existingList = preferenceRepository.findByHrUserId(hrUserId);
        Map<NotificationEventType, HrNotificationPreference> map = new EnumMap<>(NotificationEventType.class);
        for (HrNotificationPreference p : existingList) {
            map.put(p.getEventType(), p);
        }

        List<HrNotificationPreferenceDTO> result = new ArrayList<>();
        for (NotificationEventType type : CANDIDATE_EVENTS) {
            HrNotificationPreference p = map.get(type);
            boolean email = (p == null) || p.isEmailEnabled();
            boolean inApp = (p == null) || p.isInAppEnabled();

            result.add(HrNotificationPreferenceDTO.builder()
                    .eventType(type)
                    .eventLabel(CANDIDATE_EVENT_LABELS.getOrDefault(type, EVENT_LABELS.getOrDefault(type, type.name())))
                    .description(CANDIDATE_EVENT_DESCRIPTIONS.getOrDefault(type, EVENT_DESCRIPTIONS.getOrDefault(type, "")))
                    .emailEnabled(email)
                    .inAppEnabled(inApp)
                    .build());
        }

        return result;
    }

    /**
     * Saves or updates candidate notification preferences for the specified HR user ID.
     */
    @Transactional
    public List<HrNotificationPreferenceDTO> savePreferencesForHr(Long hrUserId, List<HrNotificationPreferenceDTO> dtos) {
        if (hrUserId == null || dtos == null) {
            throw new IllegalArgumentException("hrUserId and preferences list cannot be null.");
        }

        for (HrNotificationPreferenceDTO dto : dtos) {
            if (dto.getEventType() == null) continue;

            Optional<HrNotificationPreference> existingOpt =
                    preferenceRepository.findByHrUserIdAndEventType(hrUserId, dto.getEventType());

            HrNotificationPreference pref = existingOpt.orElseGet(() ->
                    HrNotificationPreference.builder()
                            .hrUserId(hrUserId)
                            .eventType(dto.getEventType())
                            .build()
            );

            pref.setEmailEnabled(Boolean.TRUE.equals(dto.getEmailEnabled()));
            pref.setInAppEnabled(Boolean.TRUE.equals(dto.getInAppEnabled()));
            preferenceRepository.save(pref);
        }

        log.info("Saved candidate notification preferences for HR User ID [{}] ({} items updated)", hrUserId, dtos.size());
        return getPreferencesForHr(hrUserId);
    }

    /**
     * Checks if email notifications are enabled by the HR for a candidate event type.
     */
    @Transactional(readOnly = true)
    public boolean isEmailEnabled(Long hrUserId, NotificationEventType eventType) {
        if (hrUserId == null || eventType == null) return true;
        return preferenceRepository.findByHrUserIdAndEventType(hrUserId, eventType)
                .map(HrNotificationPreference::isEmailEnabled)
                .orElse(true);
    }

    /**
     * Checks if in-app notifications are enabled by the HR for a candidate event type.
     */
    @Transactional(readOnly = true)
    public boolean isInAppEnabled(Long hrUserId, NotificationEventType eventType) {
        if (hrUserId == null || eventType == null) return true;
        return preferenceRepository.findByHrUserIdAndEventType(hrUserId, eventType)
                .map(HrNotificationPreference::isInAppEnabled)
                .orElse(true);
    }

    /**
     * Retrieves personal preferences for the HR user.
     */
    @Transactional(readOnly = true)
    public List<HrPersonalNotificationPreferenceDTO> getPersonalPreferencesForHr(Long hrUserId) {
        if (hrUserId == null) {
            return getDefaultPersonalPreferences();
        }

        List<HrPersonalNotificationPreference> existingList = personalPreferenceRepository.findByHrUserId(hrUserId);
        Map<NotificationEventType, HrPersonalNotificationPreference> map = new EnumMap<>(NotificationEventType.class);
        for (HrPersonalNotificationPreference p : existingList) {
            map.put(p.getEventType(), p);
        }

        List<HrPersonalNotificationPreferenceDTO> result = new ArrayList<>();
        for (NotificationEventType type : PERSONAL_EVENTS) {
            HrPersonalNotificationPreference p = map.get(type);
            boolean inApp = (p == null) || p.isInAppEnabled();
            boolean email = (p == null) || p.isEmailEnabled();

            result.add(HrPersonalNotificationPreferenceDTO.builder()
                    .eventType(type)
                    .eventLabel(EVENT_LABELS.getOrDefault(type, type.name()))
                    .description(EVENT_DESCRIPTIONS.getOrDefault(type, ""))
                    .inAppEnabled(inApp)
                    .emailEnabled(email)
                    .build());
        }

        return result;
    }

    /**
     * Saves personal notification preferences for the specified HR user ID.
     */
    @Transactional
    public List<HrPersonalNotificationPreferenceDTO> savePersonalPreferencesForHr(Long hrUserId, List<HrPersonalNotificationPreferenceDTO> dtos) {
        if (hrUserId == null || dtos == null) {
            throw new IllegalArgumentException("hrUserId and personal preferences list cannot be null.");
        }

        for (HrPersonalNotificationPreferenceDTO dto : dtos) {
            if (dto.getEventType() == null) continue;

            Optional<HrPersonalNotificationPreference> existingOpt =
                    personalPreferenceRepository.findByHrUserIdAndEventType(hrUserId, dto.getEventType());

            HrPersonalNotificationPreference pref = existingOpt.orElseGet(() ->
                    HrPersonalNotificationPreference.builder()
                            .hrUserId(hrUserId)
                            .eventType(dto.getEventType())
                            .build()
            );

            pref.setInAppEnabled(Boolean.TRUE.equals(dto.getInAppEnabled()));
            pref.setEmailEnabled(Boolean.TRUE.equals(dto.getEmailEnabled()));
            personalPreferenceRepository.save(pref);
        }

        log.info("Saved personal notification preferences for HR User ID [{}]", hrUserId);
        return getPersonalPreferencesForHr(hrUserId);
    }

    public List<HrNotificationPreferenceDTO> getDefaultPreferences() {
        List<HrNotificationPreferenceDTO> defaults = new ArrayList<>();
        for (NotificationEventType type : CANDIDATE_EVENTS) {
            defaults.add(HrNotificationPreferenceDTO.builder()
                    .eventType(type)
                    .eventLabel(CANDIDATE_EVENT_LABELS.getOrDefault(type, EVENT_LABELS.getOrDefault(type, type.name())))
                    .description(CANDIDATE_EVENT_DESCRIPTIONS.getOrDefault(type, EVENT_DESCRIPTIONS.getOrDefault(type, "")))
                    .emailEnabled(true)
                    .inAppEnabled(true)
                    .build());
        }
        return defaults;
    }

    public List<HrPersonalNotificationPreferenceDTO> getDefaultPersonalPreferences() {
        List<HrPersonalNotificationPreferenceDTO> defaults = new ArrayList<>();
        for (NotificationEventType type : PERSONAL_EVENTS) {
            defaults.add(HrPersonalNotificationPreferenceDTO.builder()
                    .eventType(type)
                    .eventLabel(EVENT_LABELS.getOrDefault(type, type.name()))
                    .description(EVENT_DESCRIPTIONS.getOrDefault(type, ""))
                    .inAppEnabled(true)
                    .emailEnabled(true)
                    .build());
        }
        return defaults;
    }

    @Transactional
    public List<HrNotificationPreferenceDTO> resetPreferencesToDefault(Long hrUserId) {
        if (hrUserId != null) {
            preferenceRepository.deleteByHrUserId(hrUserId);
            log.info("Reset candidate notification preferences to defaults for HR User ID [{}]", hrUserId);
        }
        return getDefaultPreferences();
    }
}
