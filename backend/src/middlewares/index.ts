import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload, SignOptions, VerifyErrors } from 'jsonwebtoken';
import ApiResponse from './apiResponse';
import { DBQuery } from '../services/dbservices';
import {
  JWT_SECRET,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from '../config/variables';

// Get JWT config from environment variables
const config = {
  jwtSecret: JWT_SECRET || '',
  accessTokenExpiresIn: ACCESS_TOKEN_EXPIRES_IN || '24h',
  refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN || '7d',
  serverAccessKey: process.env.SERVER_ACCESS_KEY || '', // Optional server access key
};

let userQuery = new DBQuery('User');

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

export const catchAsync = (fn: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

interface User {
  id: number;
  email: string;
  role?: string;
  firstName?: string;
  accessToken?: string[];
  refreshToken?: string;
  hubSpotContactId?: string;
  platfromAccess?: boolean;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

interface DecodedToken {
  id: number;
}

export const sendToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
  returnData: boolean = false,
) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            'Unauthorized no user found in request',
            '',
            false,
          ),
        );
    }

    const user = req.user;

    let payload = { id: user.id } as JwtPayload;

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.accessTokenExpiresIn,
    } as SignOptions);

    const refreshToken = jwt.sign(
      { id: user.id } as JwtPayload,
      config.jwtSecret,
      { expiresIn: config.refreshTokenExpiresIn } as SignOptions,
    );

    // Get current user to append to existing accessToken array
    const currentUser = await userQuery.findOnedoc({ id: user.id });
    const existingTokens = (currentUser?.accessToken as string[]) || [];

    await userQuery.findByIdAndUpdate(user.id, {
      accessToken: [...existingTokens, accessToken],
      refreshToken,
    });

    const data: any = {
      accessToken,
      user: {
        email: user?.email,
        id: user?.id,
        role: user?.role,
        platfromAccess: user?.platfromAccess,
      },
    };

    if (returnData) {
      return data;
    }
    res.status(201).json(new ApiResponse(201, 'Login successfully', data));
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, 'Unauthorized, Please login first', '', false),
      );
  }

  const decoded = jwt.decode(token) as { id: number } | null;
  if (!decoded || !decoded.id) {
    return res
      .status(401)
      .json(new ApiResponse(401, 'Invalid token', '', false));
  }
  let query = {
    id: decoded.id,
    accessToken: {
      has: token,
    },
  };
  const user = await userQuery.findOnedoc(query);
  if (!user) {
    return res
      .status(401)
      .json(
        new ApiResponse(401, 'Unauthorized, Please login first', '', false),
      );
  }

  jwt.verify(
    user.refreshToken as string,
    config.jwtSecret,
    async (err: any) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json(
              new ApiResponse(
                401,
                'Token has expired, Please login again',
                '',
                false,
              ),
            );
        } else {
          return res
            .status(401)
            .json(new ApiResponse(401, 'Invalid token', '', false));
        }
      }

      req.user = user;
      sendToken(req, res, next);
    },
  );
};

export const isAuthenticate: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res
      .status(401)
      .json(
        new ApiResponse(401, 'Unauthorized, Please login first', '', false),
      );
    return;
  }

  jwt.verify(
    token,
    config.jwtSecret,
    async (err: VerifyErrors | null, decoded: unknown) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json(
              new ApiResponse(
                401,
                'Token has expired, Please login again',
                '',
                false,
              ),
            );
        } else {
          return res
            .status(401)
            .json(new ApiResponse(401, 'Invalid token', '', false));
        }
      }

      const decodedToken = decoded as DecodedToken;

      const query = {
        id: decodedToken.id,
        accessToken: {
          has: token,
        },
      };

      const user = await userQuery.findUser(query);

      if (!user) {
        return res
          .status(401)
          .json(
            new ApiResponse(401, 'Unauthorized, Please login first', '', false),
          );
      }

      req.user = user;
      next();
    },
  );
};

export const authorizeKey: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res
      .status(401)
      .json(new ApiResponse(401, 'Unauthorized, Please send Key', '', false));
    return;
  }

  if (!config.serverAccessKey || token !== config.serverAccessKey) {
    res.status(401).json(new ApiResponse(401, 'Invalid Key', '', false));
    return;
  }

  next();
};

export const isAuthorize: any = (roles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized, Please login first',
        data: null,
        success: false,
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        statusCode: 403,
        message:
          'Forbidden, You do not have permission to access this resource',
        data: null,
        success: false,
      });
    }
    next();
  };
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
