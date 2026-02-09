import ApiResponse from '../../middlewares/apiResponse';
import {isBusinessMail } from '@myselfraj/is-business-mail'

import {
  catchAsync,
  sendToken,
  refreshToken,
  decodeToken
} from '../../middlewares/index';

import { DBQuery } from '../../services/dbservices';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

import bcrypt from 'bcryptjs';
import { sendEmail } from '../../services/send-grid';
import { generateOTPEmail ,generateForgotPasswordEmail} from '../../services/email-html/utils/emailTemplateFunctions';
import { createContact,callHubspotPatchApi,getContactByEmail } from '../hubspot/hubspot.service';
interface DecodedToken extends JwtPayload {
  id: number;
}

let userQuery = new DBQuery('User');
let OtpQuery = new DBQuery('Otp');
let ConversationQuery = new DBQuery('Conversation');
let AllowedDomainsQuery = new DBQuery('AllowedDomains');


export const register = catchAsync(async (req, res, next) => {
  const { email, password, userName, hubSpotContactId } = req.body;

  // Validate email isn't already registered
  await userQuery.checkDuplicateWithNonUniqueWithDeleted(
    { email },
    'Email already exist'
  );

  // Verify email has been verified via OTP
  const emailVerification = await OtpQuery.findOneByQuery({ 
    email, 
    verified: true 
  });
  
  if (!emailVerification) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, 'Email verification is required', '', false)
      );
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);

  // Create or use existing HubSpot contact
  let finalHubSpotContactId = hubSpotContactId;
  let  contact = await getContactByEmail(email);
  if(contact){
    finalHubSpotContactId = contact?.contactId;
  }else{
    if (!finalHubSpotContactId) {
      try {
        const contactData = {
         // firstname: userName,
          email: email,
        };
        const hubSpotResponse = await createContact(contactData);
        finalHubSpotContactId = hubSpotResponse?.data?.id;
      } catch (hubspotError) {
        console.error('HubSpot contact creation failed:', hubspotError);
        // Continue registration even if HubSpot fails
      }
    }else{
        const patchData = {
          properties: {
           // firstname: userName,
            email: email,
          },
        };
        const hubSpotResponse = await callHubspotPatchApi(`https://api.hubapi.com/crm/v3/objects/contacts/${finalHubSpotContactId}`, patchData);
    }
  }

  const userData = {
    email,
    password: hashPassword,
    userName,
    hubSpotContactId: finalHubSpotContactId,
    platfromAccess: false,
  };

  let isAllowedDomain = await AllowedDomainsQuery.findOneByQuery({ domain: `@${email.split('@')[1]}` });
  if (isAllowedDomain) {
    userData.platfromAccess = true;
  }
  // Create user in database

  await userQuery.create(userData);

  return res
    .status(201)
    .json(new ApiResponse(201, 'User registered successfully', ''));
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  let query = { email: email };
  const user = await userQuery.findOne(query,undefined,"Invalid email or password");
  if (!user) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Invalid email or password', '', false));
  }
    
  const validPassword = await bcrypt.compare(password, user.password || '');
  if (!validPassword) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'Invalid email or password', '', false));
  }

  req.user = user;
  sendToken(req, res, next);
});

export const checkEmailDelicate = catchAsync(async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res
      .status(404)
      .json(new ApiResponse(400, 'Email is required', '', false));
  }
  await userQuery.checkDuplicateWithNonUniqueWithDeleted(
    { email },
    'Email already exist',
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Email checked  successfully', ''));
});

export const refreshTokenController = catchAsync(async (req, res, next) => {
  refreshToken(req, res, next);
});

export const sendOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const isBusiness =  isBusinessMail(email);
  if (!isBusiness) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'Business or work email address allowed', '', false));
  }

  // await userQuery.checkDuplicateWithNonUniqueWithDeleted(
  //   { email },
  //   'Email already exist',
  // );


  const otp = Math.floor(100000 + Math.random() * 900000);
  const expireAt = new Date(Date.now() + 60 * 10000);

  let userOtpId = await OtpQuery.findOneByQuery({ email });
  userOtpId = userOtpId?.id;
  if (userOtpId) {
    await OtpQuery.findByQueryAndUpdate({ id: userOtpId }, { otp, expireAt });
  } else {
    await OtpQuery.create({ email, otp, expireAt });
  }

   let email_html = generateOTPEmail(otp);
   await sendEmail(email, 'Your Verification OTP', email_html);

  return res
    .status(200)
    .json(new ApiResponse(200, 'OTP sent successfully', ''));
});

export const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const userOtp = await OtpQuery.findOneByQuery({ email });

  if (!userOtp) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, 'Invalid OTP, please try again', '', false),
      );
  }

  const isExpired = userOtp.expireAt && new Date(userOtp.expireAt) < new Date();

  if (isExpired) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'OTP has expired', '', false));
  }

  if (userOtp.otp !== parseInt(otp)) {
    return res.status(400).json(new ApiResponse(400, 'Invalid OTP', '', false));
  }

  await OtpQuery.findByQueryAndUpdate({ id: userOtp.id }, { verified: true });

  return res
    .status(200)
    .json(new ApiResponse(200, 'OTP verified successfully', ''));
});

export const sendForgotPasswordOtp = catchAsync(async (req, res) => {
    const { email } = req.body;
    await userQuery.findOne(
      { email },
      undefined,
      'Email not found',
    );
  
  
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expireAt = new Date(Date.now() +  60 * 10000);
  
    let userOtpId = await OtpQuery.findOneByQuery({ email });
    userOtpId = userOtpId?.id;
    await OtpQuery.findByQueryAndUpdate({ id: userOtpId }, { otp, expireAt,forgotPasswordOtp:true });
    let email_html = generateForgotPasswordEmail(otp);

    await sendEmail(email, 'Your Verification Forgot Password OTP', email_html);
  
    return res
      .status(200)
      .json(new ApiResponse(200, 'OTP sent successfully', ''));

});

export const verifyForgotPasswordOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const userOtp = await OtpQuery.findOneByQuery({ email,forgotPasswordOtp:true });

  if (!userOtp) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, 'Invalid OTP, please try again', '', false),
      );
  }

  const isExpired = userOtp.expireAt && new Date(userOtp.expireAt) < new Date();

  if (isExpired) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'OTP has expired', '', false));
  }

  if (userOtp.otp !== parseInt(otp)) {
    return res.status(400).json(new ApiResponse(400, 'Invalid OTP', '', false));
  }

  await OtpQuery.findByQueryAndUpdate({ id: userOtp.id },{ verified: true,forgotPasswordOtpExpireAt:new Date(Date.now() + 60 * 60 * 1000) });

  return res.status(200).json(new ApiResponse(200, 'OTP verified successfully. Reset your password within 60 minutes before session expires.', '')); 
});



export const reSetPassword = catchAsync(async (req, res, next) => {
  const { password, email } = req.body;

  const emailVerification = await OtpQuery.findOneByQuery({
    email,
    forgotPasswordOtp: true,
    forgotPasswordOtpExpireAt: { gt: new Date() } // FIX
  });

  if (!emailVerification) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'Change password session has expired', '', false));
  }

  const checkUser = await userQuery.findOne({ email });
  if (!checkUser) {
    return res
      .status(404)
      .json(new ApiResponse(404, 'User not found', '', false));
  }

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);

  await userQuery.findByIdAndUpdate(checkUser.id, {
    password: hashPassword,
  });

  await OtpQuery.findByQueryAndUpdate(
    {
      email,
      forgotPasswordOtp: true
    },
    {
      forgotPasswordOtp: false,
      forgotPasswordOtpExpireAt: null
    }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, 'Password Reset Successfully', ''));
});


export const getProfile = catchAsync(async (req, res, next) => {
  const user = req.user?.id;
  let data = await userQuery.findOneWithSelect({ id: user }, undefined, {
    id: true,
    email: true,
    userName: true,
    platfromAccess: true,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, 'Your profile has been retrieved successfully', data));
});


export const attachedConversationIds = catchAsync(async (req, res, next) => {
  const userId = req.user?.id;
  const ids = req.body.ids;

  for (const id of ids) {
    await ConversationQuery.findOneWithSelect(
      { id },
      undefined,
      undefined,
      'Conversation not found'
    );

    await ConversationQuery.findandUpdate(
      { id },
      { userId }
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, 'Conversation IDs attached successfully', ''));
});
