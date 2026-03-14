import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

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
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null
    });
    
    if (!token) {
      res.status(401).json({ 
        status: 'error',
        message: 'No token provided' 
      });
      return;
    }

    // Validate token format - JWT tokens are typically 200+ characters
    // They have 3 parts separated by dots: header.payload.signature
    if (token.length < 50) {
      console.error('Token too short - likely corrupted or truncated:', {
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50),
        path: req.path
      });
      res.status(401).json({ 
        status: 'error',
        message: 'Invalid token format: Token appears to be truncated or corrupted',
        code: 'INVALID_TOKEN_FORMAT',
        details: `Token length: ${token.length} (expected: 200+ characters)`
      });
      return;
    }

    // Check if token has proper JWT format (3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid JWT format - token should have 3 parts:', {
        parts: tokenParts.length,
        tokenPreview: token.substring(0, 50),
        path: req.path
      });
      res.status(401).json({ 
        status: 'error',
        message: 'Invalid token format: Token is not a valid JWT',
        code: 'INVALID_JWT_FORMAT',
        details: `Token has ${tokenParts.length} parts (expected: 3 parts separated by dots)`
      });
      return;
    }

    try {
      const decoded = await verifyToken(token);
      req.userId = decoded.userId;
      
      // Get the latest role from database (not from token, in case it changed)
      const user = await User.findById(decoded.userId).select('role');
      if (user) {
        req.role = user.role;
      } else {
        req.role = decoded.role; // Fallback to token role if user not found
      }
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
