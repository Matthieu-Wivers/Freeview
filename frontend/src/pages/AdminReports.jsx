import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  listAdminReports,
  moderateComment,
  moderateSharedGame,
  updateAdminReport,
} from '../services/freeviewApi';
import { formatDate, getUserDisplayName } from '../utils/pgn';

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'action_taken', label: 'Action taken' },
  { value: 'rejected', label: 'Rejected' },
];

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== '' &&
      String(value) !== 'undefined' &&
      String(value) !== 'null',
  );
}

function getReportTarget(report) {
  const targetType = firstDefined(report.target_type, report.targetType);
  const sharedGameId = firstDefined(
    report.shared_game_id,
    report.sharedGameId,
    report.shared_game?.id,
    report.sharedGame?.id,
  );
  const commentId = firstDefined(
    report.comment_id,
    report.commentId,
    report.comment?.id,
  );

  return {
    targetType,
    sharedGameId,
    commentId,
    targetId: targetType === 'comment' ? commentId : sharedGameId,
  };
}

function getReporterName(report) {
  const directName = firstDefined(
    report.reporter_username,
    report.reporterUsername,
  );

  if (directName) {
    return directName;
  }

  return getUserDisplayName(report.reporter || report.user || {});
}

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
      setReports(Array.isArray(items) ? items : []);
    } catch (apiError) {
      setError(apiError.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [status]);

  async function handleReportStatus(reportId, nextStatus) {
    setError('');

    try {
      const updated = await updateAdminReport(reportId, { status: nextStatus });

      setReports((items) => {
        if (nextStatus !== status) {
          return items.filter((report) => String(report.id) !== String(reportId));
        }

        return items.map((report) =>
          String(report.id) === String(reportId)
            ? { ...report, ...updated, status: nextStatus }
            : report,
        );
      });
    } catch (apiError) {
      setError(apiError.message || 'Unable to process the report.');
      throw apiError;
    }
  }

  async function handleModeration(report, moderationStatus) {
    const { targetType, targetId } = getReportTarget(report);

    setError('');

    if (!targetType || !targetId) {
      setError('This report does not contain a valid moderation target.');
      return;
    }

    try {
      if (targetType === 'comment') {
        await moderateComment(targetId, moderationStatus);
      } else if (targetType === 'shared_game') {
        await moderateSharedGame(targetId, moderationStatus);
      } else {
        setError(`Unsupported report target: ${targetType}.`);
        return;
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
          const { targetType, sharedGameId, targetId } = getReportTarget(report);
          const reporterName = getReporterName(report);
          const targetLabel = targetType === 'comment' ? 'Comment' : 'Shared review';
          const targetPreview =
            targetType === 'comment'
              ? firstDefined(report.comment_content, report.commentContent)
              : firstDefined(report.shared_game_title, report.sharedGameTitle);
          const hasValidTarget = Boolean(targetType && targetId);

          return (
            <article className="panel admin-card" key={report.id}>
              <div>
                <p className="eyebrow">{targetLabel}</p>
                <h2>Report #{report.id}</h2>

                {targetPreview && <p className="subtle">{targetPreview}</p>}

                <p>{report.details || report.reason || 'No details provided.'}</p>

                <div className="community-meta-list community-meta-list--inline">
                  <span>
                    <strong>Reporter</strong>
                    {reporterName}
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
                {sharedGameId && (
                  <Link
                    className="btn btn--secondary"
                    to={`/shared-games/${sharedGameId}`}
                  >
                    Open
                  </Link>
                )}

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => void handleModeration(report, 'hidden')}
                  disabled={!hasValidTarget}
                >
                  Hide
                </button>

                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => void handleModeration(report, 'visible')}
                  disabled={!hasValidTarget}
                >
                  Restore
                </button>

                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => void handleReportStatus(report.id, 'reviewed')}
                >
                  Mark reviewed
                </button>

                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => void handleReportStatus(report.id, 'rejected')}
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