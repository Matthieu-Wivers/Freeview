import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listAdminReports, moderateComment, moderateSharedGame, updateAdminReport } from '../services/freeviewApi';
import { formatDate, getUserDisplayName } from '../utils/pgn';

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'action_taken', label: 'Action taken' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReports() {
    setLoading(true);
    setError('');

    try {
      const items = await listAdminReports({ status });
      setReports(items);
    } catch (apiError) {
      setError(apiError.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [status]);

  async function handleReportStatus(reportId, nextStatus) {
    try {
      const updated = await updateAdminReport(reportId, { status: nextStatus });

      setReports((items) =>
        items.map((report) =>
          String(report.id) === String(reportId)
            ? { ...report, ...updated, status: nextStatus }
            : report,
        ),
      );
    } catch (apiError) {
      setError(apiError.message || 'Unable to process the report.');
    }
  }

  async function handleModeration(report, moderationStatus) {
    const targetType = report.target_type || report.targetType;
    const targetId = report.target_id || report.targetId;

    try {
      if (targetType === 'comment') {
        await moderateComment(targetId, moderationStatus);
      } else {
        await moderateSharedGame(targetId, moderationStatus);
      }

      await handleReportStatus(report.id, 'action_taken');
    } catch (apiError) {
      setError(apiError.message || 'Unable to apply moderation action.');
    }
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Reports</h1>
            <p className="subtle">Review content reported by community members.</p>
          </div>

          <Link className="btn btn--secondary" to="/admin/moderation">
            Moderation
          </Link>
        </div>

        <div className="community-tabs">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={status === option.value ? 'btn btn--primary' : 'btn btn--secondary'}
              type="button"
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <p className="panel community-state">
          Loading reports...
        </p>
      )}

      {error && (
        <p className="panel community-state error-text">
          {error}
        </p>
      )}

      <div className="admin-list">
        {reports.map((report) => {
          const reporter = report.reporter || report.user || {};
          const targetType = report.target_type || report.targetType;
          const targetId = report.target_id || report.targetId;

          return (
            <article className="panel admin-card" key={report.id}>
              <div>
                <p className="eyebrow">{targetType}</p>
                <h2>Report #{report.id}</h2>
                <p>{report.details || report.reason || 'No details provided.'}</p>

                <div className="community-meta-list community-meta-list--inline">
                  <span>
                    <strong>Reporter</strong>
                    {getUserDisplayName(reporter)}
                  </span>

                  <span>
                    <strong>Status</strong>
                    {report.status}
                  </span>

                  <span>
                    <strong>Date</strong>
                    {formatDate(report.created_at || report.createdAt)}
                  </span>
                </div>
              </div>

              <div className="admin-card__actions">
                {targetType !== 'comment' && (
                  <Link className="btn btn--secondary" to={`/shared-games/${targetId}`}>
                    Open
                  </Link>
                )}

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => handleModeration(report, 'hidden')}
                >
                  Hide
                </button>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => handleModeration(report, 'visible')}
                >
                  Restore
                </button>

                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => handleReportStatus(report.id, 'reviewed')}
                >
                  Mark reviewed
                </button>

                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => handleReportStatus(report.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && reports.length === 0 && (
        <p className="panel community-state">
          No reports in this category.
        </p>
      )}
    </div>
  );
}