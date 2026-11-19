package com.smarthire.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.dto.CandidateFormSubmissionDTO;
import com.smarthire.dto.JobQuestionDTO;
import com.smarthire.entity.CandidateFormResponse;
import com.smarthire.entity.Job;
import com.smarthire.entity.JobQuestion;
import com.smarthire.entity.QuestionType;
import com.smarthire.repository.CandidateFormResponseRepository;
import com.smarthire.repository.JobQuestionRepository;
import com.smarthire.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobScreeningService {

    private final JobQuestionRepository jobQuestionRepository;
    private final CandidateFormResponseRepository candidateFormResponseRepository;
    private final JobRepository jobRepository;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Standard default screening templates recommended for HR recruiters.
     */
    public List<JobQuestionDTO> getDefaultQuestionTemplates() {
        return List.of(
                JobQuestionDTO.builder()
                        .questionText("How many years of total work experience do you have?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(true)
                        .orderIndex(0)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("How many years of relevant experience do you have?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(true)
                        .orderIndex(1)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("What is your current CTC?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(true)
                        .orderIndex(2)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("What is your expected CTC?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(true)
                        .orderIndex(3)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("What is your current notice period?")
                        .questionType(QuestionType.MULTIPLE_CHOICE.name())
                        .options(List.of("Immediate (0-15 days)", "30 Days", "60 Days", "90 Days"))
                        .isRequired(true)
                        .orderIndex(4)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("What is your current location?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(true)
                        .orderIndex(5)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("Are you comfortable working from the office (WFO)?")
                        .questionType(QuestionType.MULTIPLE_CHOICE.name())
                        .options(List.of("Yes, 100% comfortable", "Hybrid (2-3 days WFO)", "Remote only"))
                        .isRequired(true)
                        .orderIndex(6)
                        .build(),
                JobQuestionDTO.builder()
                        .questionText("Why are you looking for a job change?")
                        .questionType(QuestionType.TEXT.name())
                        .isRequired(false)
                        .orderIndex(7)
                        .build()
        );
    }

    @Transactional(readOnly = true)
    public List<JobQuestionDTO> getQuestionsForJob(Long jobId) {
        if (jobId == null) return Collections.emptyList();
        List<JobQuestion> list = jobQuestionRepository.findByJobIdOrderByOrderIndexAsc(jobId);
        return list.stream().map(JobQuestionDTO::fromEntity).toList();
    }

    @Transactional
    public List<JobQuestion> saveQuestionsForJob(Long jobId, List<JobQuestionDTO> questionDTOs) {
        if (jobId == null) return Collections.emptyList();
        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            throw new IllegalArgumentException("Job with ID " + jobId + " does not exist.");
        }

        Job job = jobOpt.get();

        // Clear existing questions for clean overwrite
        jobQuestionRepository.deleteByJobId(jobId);

        if (questionDTOs == null || questionDTOs.isEmpty()) {
            return Collections.emptyList();
        }

        List<JobQuestion> entitiesToSave = new ArrayList<>();
        int index = 0;
        for (JobQuestionDTO dto : questionDTOs) {
            if (dto.getQuestionText() == null || dto.getQuestionText().isBlank()) {
                continue;
            }

            QuestionType qType = QuestionType.TEXT;
            if (dto.getQuestionType() != null && QuestionType.MULTIPLE_CHOICE.name().equalsIgnoreCase(dto.getQuestionType())) {
                qType = QuestionType.MULTIPLE_CHOICE;
            }

            String optionsJson = null;
            if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
                try {
                    optionsJson = MAPPER.writeValueAsString(dto.getOptions());
                } catch (JsonProcessingException e) {
                    optionsJson = String.join(",", dto.getOptions());
                }
            }

            JobQuestion question = JobQuestion.builder()
                    .job(job)
                    .questionText(dto.getQuestionText().trim())
                    .questionType(qType)
                    .optionsJson(optionsJson)
                    .isRequired(dto.getIsRequired() != null ? dto.getIsRequired() : true)
                    .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : index)
                    .build();

            entitiesToSave.add(question);
            index++;
        }

        List<JobQuestion> saved = jobQuestionRepository.saveAll(entitiesToSave);
        log.info("Saved {} screening questions for Job ID [{}]", saved.size(), jobId);
        return saved;
    }

    @Transactional
    public List<CandidateFormResponse> saveCandidateResponses(Long applicationId, List<CandidateFormSubmissionDTO.QuestionResponseItem> responses) {
        if (applicationId == null || responses == null || responses.isEmpty()) {
            return Collections.emptyList();
        }

        List<CandidateFormResponse> savedList = new ArrayList<>();
        for (CandidateFormSubmissionDTO.QuestionResponseItem item : responses) {
            if (item.getQuestionId() == null) continue;

            Optional<JobQuestion> questionOpt = jobQuestionRepository.findById(item.getQuestionId());
            if (questionOpt.isEmpty()) continue;

            // Check if response already exists for this application and question
            List<CandidateFormResponse> existing = candidateFormResponseRepository.findByApplicationIdAndQuestionId(applicationId, item.getQuestionId());
            CandidateFormResponse response;
            if (!existing.isEmpty()) {
                response = existing.get(0);
                response.setAnswerText(item.getAnswerText() != null ? item.getAnswerText().trim() : "");
            } else {
                response = CandidateFormResponse.builder()
                        .applicationId(applicationId)
                        .question(questionOpt.get())
                        .answerText(item.getAnswerText() != null ? item.getAnswerText().trim() : "")
                        .build();
            }

            savedList.add(candidateFormResponseRepository.save(response));
        }

        log.info("Saved {} screening responses for application ID [{}]", savedList.size(), applicationId);
        return savedList;
    }

    @Transactional(readOnly = true)
    public List<CandidateFormResponse> getResponsesForApplication(Long applicationId) {
        if (applicationId == null) return Collections.emptyList();
        return candidateFormResponseRepository.findByApplicationIdOrderByIdAsc(applicationId);
    }
}
