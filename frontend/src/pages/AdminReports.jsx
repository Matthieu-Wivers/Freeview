import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listAdminReports, moderateComment, moderateSharedGame, updateAdminReport } from '../services/freeviewApi';
import { formatDate, getUserDisplayName } from '../utils/pgn';

const statusOptions = [
  { value: 'open', label: 'Ouverts' },
  { value: 'reviewed', label: 'Relus' },
  { value: 'action_taken', label: 'Action effectuée' },
  { value: 'rejected', label: 'Rejetés' },
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
      setError(apiError.message || 'Impossible de charger les signalements.');
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
      setReports((items) => items.map((report) => (String(report.id) === String(reportId) ? { ...report, ...updated, status: nextStatus } : report)));
    } catch (apiError) {
      setError(apiError.message || 'Impossible de traiter le signalement.');
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
      setError(apiError.message || 'Action de modération impossible.');
    }
  }

  return (
    <div className="community-page">
      <section className="panel community-header">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Administration</p>
            <h1>Signalements</h1>
            <p className="subtle">Traite les contenus signalés par les membres.</p>
          </div>
          <Link className="btn btn--secondary" to="/admin/moderation">Modération</Link>
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

      {loading && <p className="panel community-state">Chargement des signalements...</p>}
      {error && <p className="panel community-state error-text">{error}</p>}

      <div className="admin-list">
        {reports.map((report) => {
          const reporter = report.reporter || report.user || {};
          const targetType = report.target_type || report.targetType;
          const targetId = report.target_id || report.targetId;

          return (
            <article className="panel admin-card" key={report.id}>
              <div>
                <p className="eyebrow">{targetType}</p>
                <h2>Signalement #{report.id}</h2>
                <p>{report.details || report.reason || 'Aucun détail fourni.'}</p>
                <div className="community-meta-list community-meta-list--inline">
                  <span><strong>Auteur</strong>{getUserDisplayName(reporter)}</span>
                  <span><strong>Statut</strong>{report.status}</span>
                  <span><strong>Date</strong>{formatDate(report.created_at || report.createdAt)}</span>
                </div>
              </div>
              <div className="admin-card__actions">
                {targetType !== 'comment' && <Link className="btn btn--secondary" to={`/shared-games/${targetId}`}>Ouvrir</Link>}
                <button className="btn btn--ghost" type="button" onClick={() => handleModeration(report, 'hidden')}>Masquer</button>
                <button className="btn btn--ghost" type="button" onClick={() => handleModeration(report, 'visible')}>Restaurer</button>
                <button className="btn btn--secondary" type="button" onClick={() => handleReportStatus(report.id, 'reviewed')}>Marquer relu</button>
                <button className="btn btn--secondary" type="button" onClick={() => handleReportStatus(report.id, 'rejected')}>Rejeter</button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && reports.length === 0 && <p className="panel community-state">Aucun signalement dans cette catégorie.</p>}
    </div>
  );
}
