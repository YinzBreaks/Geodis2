import { Request, Response, NextFunction } from 'express';
import '../types/auth';

export const autheliaGuard = (req: Request, res: Response, next: NextFunction): void => {
  const remoteUser = req.header('x-remote-user');

  if (!remoteUser) {
    res.status(401).json({ error: 'Unauthorized: Missing x-remote-user header' });
    return;
  }

  const remoteGroupsHeader = req.header('x-remote-groups') || '';
  const groups = remoteGroupsHeader
    ? remoteGroupsHeader.split(',').map((group) => group.trim()).filter(Boolean)
    : [];

  const isExpert = groups.some((group) => group === 'teachers' || group === 'admins');
  const role: 'expert' | 'student' = isExpert ? 'expert' : 'student';

  req.user = {
    username: remoteUser,
    groups,
    role,
  };

  next();
};
