export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Connexion requise.',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'ADMIN_REQUIRED',
      message: 'Accès administrateur requis.',
    });
  }

  return next();
}
