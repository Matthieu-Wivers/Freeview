import { createReport, listAdminReports, updateAdminReport } from '../services/report.service.js';

export async function createReportController(req, res, next) {
  try {
    const report = await createReport(req.user.id, req.body ?? {});
    return res.status(201).json({ report });
  } catch (error) {
    return next(error);
  }
}

export async function listAdminReportsController(req, res, next) {
  try {
    const reports = await listAdminReports(req.query ?? {});
    return res.json({ reports });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminReportController(req, res, next) {
  try {
    const report = await updateAdminReport(req.user.id, req.params.id, req.body ?? {});
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
}
