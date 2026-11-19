import React, { useState } from 'react';
import CustomSelect from '../common/CustomSelect';
import api from '../../api/client';

export default function JobQuestionBuilder({ questions = [], setQuestions, disabled = false, atsThreshold = 60 }) {
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState({});

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await api.get('/jobs/questions/templates');
      const templates = res.data?.templates || [];
      if (templates.length > 0) {
        setQuestions((prev) => {
          // If no questions exist, set directly
          if (!prev || prev.length === 0) return templates;
          // Merge avoiding exact text duplicates
          const existingTexts = new Set(prev.map((q) => q.questionText.trim().toLowerCase()));
          const newOnes = templates.filter(
            (t) => !existingTexts.has(t.questionText.trim().toLowerCase())
          );
          return [...prev, ...newOnes];
        });
      }
    } catch (err) {
      console.warn('Failed to load templates from API, using fallback templates:', err);
      const fallback = [
        { questionText: 'How many years of total work experience do you have?', questionType: 'TEXT', required: true, orderIndex: 0 },
        { questionText: 'How many years of relevant experience do you have?', questionType: 'TEXT', required: true, orderIndex: 1 },
        { questionText: 'What is your current CTC?', questionType: 'TEXT', required: true, orderIndex: 2 },
        { questionText: 'What is your expected CTC?', questionType: 'TEXT', required: true, orderIndex: 3 },
        { questionText: 'What is your current notice period?', questionType: 'MULTIPLE_CHOICE', options: ['Immediate (0-15 days)', '30 Days', '60 Days', '90 Days'], required: true, orderIndex: 4 },
        { questionText: 'What is your current location?', questionType: 'TEXT', required: true, orderIndex: 5 },
        { questionText: 'Are you comfortable working from the office (WFO)?', questionType: 'MULTIPLE_CHOICE', options: ['Yes, 100% comfortable', 'Hybrid (2-3 days WFO)', 'Remote only'], required: true, orderIndex: 6 },
        { questionText: 'Why are you looking for a job change?', questionType: 'TEXT', required: false, orderIndex: 7 }
      ];
      setQuestions(fallback);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: null,
      questionText: '',
      questionType: 'TEXT',
      options: [],
      required: true,
      orderIndex: questions.length
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateText = (index, text) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], questionText: text };
    setQuestions(updated);
  };

  const handleUpdateType = (index, type) => {
    const updated = [...questions];
    const prev = updated[index];
    updated[index] = {
      ...prev,
      questionType: type,
      options: type === 'MULTIPLE_CHOICE' && (!prev.options || prev.options.length === 0)
        ? ['Option 1', 'Option 2']
        : prev.options
    };
    setQuestions(updated);
  };

  const handleToggleRequired = (index) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], required: !updated[index].required };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index) => {
    const updated = questions.filter((_, idx) => idx !== index).map((q, idx) => ({
      ...q,
      orderIndex: idx
    }));
    setQuestions(updated);
  };

  const handleAddOption = (qIndex) => {
    const text = (newOptionInputs[qIndex] || '').trim();
    if (!text) return;
    const updated = [...questions];
    const opts = updated[qIndex].options ? [...updated[qIndex].options] : [];
    opts.push(text);
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
    setNewOptionInputs({ ...newOptionInputs, [qIndex]: '' });
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const opts = updated[qIndex].options.filter((_, idx) => idx !== optIndex);
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex, optIndex, newText) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options || [])];
    opts[optIndex] = newText;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setQuestions(updated);
  };

  const moveQuestion = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setQuestions(updated.map((q, idx) => ({ ...q, orderIndex: idx })));
  };

  return (
    <div className="card" style={{ marginTop: '24px', border: '1px solid var(--border)' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-ui-checks-grid" style={{ color: 'var(--accent)' }}></i>
            Candidate Pre-Screening Questionnaire
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Candidates scoring <strong>{atsThreshold || 60}% or higher</strong> on the ATS resume evaluation will be required to answer these questions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadTemplates}
            disabled={disabled || loadingTemplates}
            title="Import 8 standard pre-screening question templates"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="bi bi-magic"></i>
            {loadingTemplates ? 'Loading...' : '✨ Load 8 Standard Templates'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleAddQuestion}
            disabled={disabled}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="bi bi-plus-lg"></i>
            Add Custom Question
          </button>
        </div>
      </div>

      <div className="card-body" style={{ padding: '20px' }}>
        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-light, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            <i className="bi bi-question-diamond" style={{ fontSize: '2.4rem', color: 'var(--text-muted)' }}></i>
            <h4 style={{ margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: 600 }}>No Screening Questions Attached</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Add custom questions or click below to load standard hiring questions (Experience, CTC, Notice Period, Location).
            </p>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={loadTemplates}
              disabled={disabled || loadingTemplates}
            >
              ✨ Insert 8 Default Templates
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: 'var(--bg-card, #ffffff)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span
                      style={{
                        background: 'var(--accent, #4f46e5)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {qIndex + 1}
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter question text (e.g. What is your current CTC?)"
                      value={q.questionText}
                      onChange={(e) => handleUpdateText(qIndex, e.target.value)}
                      disabled={disabled}
                      style={{ fontWeight: 500 }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveQuestion(qIndex, qIndex - 1)}
                      disabled={disabled || qIndex === 0}
                      title="Move Up"
                    >
                      <i className="bi bi-arrow-up"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveQuestion(qIndex, qIndex + 1)}
                      disabled={disabled || qIndex === questions.length - 1}
                      title="Move Down"
                    >
                      <i className="bi bi-arrow-down"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      onClick={() => handleDeleteQuestion(qIndex)}
                      disabled={disabled}
                      title="Delete Question"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                    <label style={{ margin: 0, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Type:</label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect
                        size="sm"
                        value={q.questionType}
                        onChange={(val) => handleUpdateType(qIndex, val)}
                        disabled={disabled}
                        options={[
                          { value: 'TEXT', label: 'Short Answer (Text)' },
                          { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
                        ]}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={q.required !== false}
                        onChange={() => handleToggleRequired(qIndex)}
                        disabled={disabled}
                      />
                      <span>Required for Candidate</span>
                    </label>
                  </div>
                </div>

                {q.questionType === 'MULTIPLE_CHOICE' && (
                  <div style={{ marginTop: '12px', paddingLeft: '32px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Choice Options:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--primary, #6366f1)', fontSize: '0.85rem', fontWeight: 700, minWidth: '18px' }}>
                            {optIdx + 1}.
                          </span>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                            placeholder={`Option ${optIdx + 1}`}
                            disabled={disabled}
                            style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-danger"
                            onClick={() => handleRemoveOption(qIndex, optIdx)}
                            disabled={disabled}
                            title="Remove Option"
                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Add new option (e.g. 30 Days)"
                          value={newOptionInputs[qIndex] || ''}
                          onChange={(e) => setNewOptionInputs({ ...newOptionInputs, [qIndex]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOption(qIndex);
                            }
                          }}
                          disabled={disabled}
                          style={{ maxWidth: '280px' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddOption(qIndex)}
                          disabled={disabled || !(newOptionInputs[qIndex] || '').trim()}
                        >
                          + Add Option
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
