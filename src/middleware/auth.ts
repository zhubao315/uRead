import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access token required'
    });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      const decoded = jwt.verify(token, secret) as {
        id: string;
        email: string;
        name: string;
      };

      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      console.warn('Invalid token provided:', error.message);
    }
  }

  next();
};