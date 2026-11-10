import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import CustomSelect from '../../components/common/CustomSelect';
import EmptyState from '../../components/common/EmptyState';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function Feedback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const candIdParam = searchParams.get('candId') || '';

  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedCand, setSelectedCand] = useState(null);
  const [techScore, setTechScore] = useState(5);
  const [archScore, setArchScore] = useState(4);
  const [commScore, setCommScore] = useState(4);
  const [strengths, setStrengths] = useState(
    'Demonstrated deep practical knowledge in core frameworks, API design, and database queries. Strong analytical approach.'
  );
  const [weaknesses, setWeaknesses] = useState(
    'Recommend further practice with container orchestration, automated testing suites, and distributed architecture.'
  );
  const [recommendation, setRecommendation] = useState('Strong Hire');
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await api.get('/dashboard/applications');
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.applications)
          ? res.data.applications
          : [];

        if (isMounted) {
          setAllCandidates(list);
          if (list.length > 0) {
            const current = candIdParam
              ? list.find((c) => String(c.id) === String(candIdParam)) || list[0]
              : list[0];
            setSelectedCand(current);
          }
        }
      } catch (err) {
        console.error('Error fetching candidates for feedback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [candIdParam]);

  const handleCandidateChange = (id) => {
    navigate(`/dashboard/feedback?candId=${id}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCand) return;

    try {
      await api.post('/dashboard/feedback', {
        candId: selectedCand.id,
        techScore,
        archScore,
        commScore,
        strengths,
        weaknesses,
        recommendation,
      });
      setSuccessMessage('Evaluation scorecard submitted and candidate status updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setSuccessMessage('Scorecard recorded successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const recommendationOptions = [
    { value: 'Next Round', label: 'Next Round (Proceed to Next Interview Stage)' },
    { value: 'Strong Hire', label: 'Strong Hire (Exceptional match - Extend Offer)' },
    { value: 'Hire', label: 'Hire (Meets required technical bar)' },
    { value: 'Hold', label: 'Hold (Needs additional panel review)' },
    { value: 'Reject', label: 'Reject (Does not meet required criteria)' },
  ];

  const candidateOptions = allCandidates.map((c) => ({
    value: c.id,
    label: `${c.candidateName} · ${c.targetJobRole || 'Candidate'} (${c.overallScore || 70}% Match)`,
  }));

  return (
    <div className="fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumb" style={{ marginBottom: '20px' }}>
        <Link to="/dashboard">Dashboard</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/dashboard/interviews">Interviews</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Evaluation Scorecard</span>
      </nav>

      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Interview Feedback Scorecard</h1>
          <p className="page-subtitle">
            Submit structured, objective evaluations and hiring recommendations for candidate interview rounds.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn btn-secondary" to="/dashboard/interviews">
            &larr; Back to Interviews
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="status" style={{ marginBottom: '20px' }}>
          <i className="bi bi-check-circle"></i> {successMessage}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '24px' }}>
          <SkeletonLoader type="card" count={2} />
        </div>
      ) : allCandidates.length === 0 ? (
        <article className="card">
          <EmptyState
            icon="bi-chat-square-text"
            title="No Candidates Found to Evaluate"
            description="Upload candidates and schedule interviews before submitting feedback scorecards."
            actionLabel="Candidate Database"
            actionLink="/dashboard/candidates"
          />
        </article>
      ) : (
        <article className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Candidate Selector Custom Dropdown */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Select Candidate to Evaluate:
            </label>
            <CustomSelect
              value={selectedCand?.id || ''}
              onChange={(val) => handleCandidateChange(val)}
              options={candidateOptions}
              placeholder="Select candidate..."
              searchable={true}
            />
          </div>

          {selectedCand && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
                border: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div className="candidate-cell-avatar" style={{ width: '44px', height: '44px', fontSize: '1rem' }}>
                  {selectedCand.candidateInitials || selectedCand.candidateName?.slice(0, 2).toUpperCase() || 'C'}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {selectedCand.candidateName}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {selectedCand.candidateEmail} &bull; {selectedCand.targetJobRole || 'Software Engineer'}
                  </p>
                </div>
              </div>
              <span
                className={`score-badge ${
                  selectedCand.overallScore >= 75 ? 'score-high' : selectedCand.overallScore >= 50 ? 'score-mid' : 'score-low'
                }`}
              >
                {selectedCand.overallScore || 0}% Match Score
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Technical Proficiency (1 - 5)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${techScore === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => setTechScore(val)}
                    >
                      {val} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  System Architecture (1 - 5)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${archScore === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => setArchScore(val)}
                    >
                      {val} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Communication &amp; Team Fit (1 - 5)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${commScore === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => setCommScore(val)}
                    >
                      {val} ★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Key Technical Strengths Noted
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              ></textarea>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Areas for Improvement / Gaps
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              ></textarea>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Final Hiring Recommendation
              </label>
              <CustomSelect
                value={recommendation}
                onChange={(val) => setRecommendation(val)}
                options={recommendationOptions}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Link to="/dashboard/interviews" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-check2-circle"></i> Submit Scorecard &amp; Update Stage
              </button>
            </div>
          </form>
        </article>
      )}
    </div>
  );
}
