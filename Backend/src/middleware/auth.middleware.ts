import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  role?: string;
}

export const verifyToken = async (token: string): Promise<{ userId: string; role: string }> => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        const payload = decoded as { userId: string; role: string };
        resolve(payload);
      }
    });
  });
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.role || !roles.includes(req.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
