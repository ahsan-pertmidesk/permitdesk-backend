import { Router } from 'express';
import { register, login,checkEmailDelicate,sendOtp,verifyOtp,sendForgotPasswordOtp,
    verifyForgotPasswordOtp,reSetPassword,refreshTokenController,getProfile,attachedConversationIds} from './auth.controller';
import { validate } from '../../middlewares/validater';
import {isAuthenticate} from '../../middlewares/index';
import { registerSchema, loginSchema ,sendOtpSchema,verifyOtpSchema,reSetPasswordSchema } from './auth.validator';
export const authRoutes = Router();
  

authRoutes.post('/register', validate(registerSchema), register);
authRoutes.post('/login', login);
authRoutes.get('/check-email-delicate/:email', checkEmailDelicate);
authRoutes.post('/send-otp',validate(sendOtpSchema),  sendOtp);
authRoutes.post('/send-forgot-password-otp',validate(sendOtpSchema),  sendForgotPasswordOtp);
authRoutes.post('/verify-Otp', validate(verifyOtpSchema), verifyOtp);
authRoutes.post('/verify-forgot-password-otp', validate(verifyOtpSchema), verifyForgotPasswordOtp); 
authRoutes.post('/re-set-password', validate(reSetPasswordSchema), reSetPassword);
authRoutes.get('/refresh-token', refreshTokenController);
authRoutes.get('/profile', isAuthenticate, getProfile);
authRoutes.post('/attached-conversationIds', isAuthenticate, attachedConversationIds);


export default authRoutes;