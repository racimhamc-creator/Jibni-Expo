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
    let token: string | undefined;
    
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no header, check cookies (for admin dashboard)
    if (!token && req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    }
    
    console.log('Auth check:', { 
      hasAuthHeader: !!authHeader, 
      hasCookie: !!req.cookies?.admin_token,
      path: req.path,
      tokenLength: token?.length || 0
    });
    
    if (!token) {
      res.status(401).json({ 
        status: 'error',
        message: 'No token provided' 
      });
      return;
    }

    try {
      const decoded = await verifyToken(token);
      req.userId = decoded.userId;
      req.role = decoded.role;
      next();
    } catch (verifyError: any) {
      // Try to decode without verification to get more info about the error
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not defined');
        res.status(500).json({ 
          status: 'error',
          message: 'Server configuration error' 
        });
        return;
      }

      // Decode token without verification to check if it's expired or malformed
      let decodedPayload: any = null;
      try {
        decodedPayload = jwt.decode(token);
      } catch (decodeError) {
        console.error('Token decode error:', decodeError);
      }

      // Log detailed error information
      console.error('Token verification failed:', {
        error: verifyError?.name || 'Unknown',
        message: verifyError?.message || 'Token verification failed',
        path: req.path,
        hasPayload: !!decodedPayload,
        payloadExpiry: decodedPayload?.exp ? new Date(decodedPayload.exp * 1000).toISOString() : null,
        currentTime: new Date().toISOString(),
        isExpired: decodedPayload?.exp ? Date.now() >= decodedPayload.exp * 1000 : null
      });

      // If token is expired, provide more helpful error message
      if (verifyError?.name === 'TokenExpiredError') {
        res.status(401).json({ 
          status: 'error',
          message: 'Token has expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }

      // If token is malformed
      if (verifyError?.name === 'JsonWebTokenError') {
        res.status(401).json({ 
          status: 'error',
          message: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Generic error
      res.status(401).json({ 
        status: 'error',
        message: 'Invalid or expired token',
        code: 'AUTH_ERROR'
      });
    }
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({ 
      status: 'error',
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
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
