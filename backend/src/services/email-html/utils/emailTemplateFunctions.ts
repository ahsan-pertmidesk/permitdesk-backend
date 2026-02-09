import { sendEmail } from '../../send-grid';   
import { genBodyHtml } from './gen-body-html'; 
import { genHtmlButton } from './gen-button-html';
import { genSubjectHtml } from './gen-subject-html';
import { generatePermitDeskEmailTemplate, generateContactEmailTemplate } from './PermitDeskEmailTemplate';
let logo_url = "http://cdn.mcauto-images-production.sendgrid.net/f42d6779274f241d/209c8ade-8140-4f88-8a7b-35b344430939/515x76.png"
export const generateForgotPasswordEmail = (otp: number) => {
  const metadata = {
    title: 'Reset Your Password',
    main_message: `
      We received a request to reset your password for your <strong>PERMITDESK</strong> account.<br/><br/>
      Please use the one-time password (OTP) below to reset your password.
    `,
      logo_url: logo_url,

      otp_code: String(otp),

    info_message: `
      <strong>Important:</strong><br/>
      • This code will expire in <strong>10 minutes</strong>.<br/>
      • Never share your OTP with anyone.<br/>
      • If you did not request this, simply ignore this email.<br/><br/>
      If you need help, contact our Support team at 
      <a href="mailto:support@permitdesk.com">support@permitdesk.com</a>.<br/><br/>
      Warm regards,<br/>
      <strong>PERMITDESK Team</strong>
    `,

    help_link: 'mailto:support@permitdesk.com'
  };

  return generatePermitDeskEmailTemplate(metadata);
};



export const generateOTPEmail = (otp: number) => {
  const metadata = {
    title: 'Your Verification Code',
    main_message: `
      Hi there!<br/><br/>
      Please use the one-time password (OTP) below to verify your account.
    `,
    logo_url: logo_url,

    otp_code: String(otp),

    info_message: `
      <strong>Security Notice:</strong><br/>
      • This code will expire in <strong>10 minutes</strong>.<br/>
      • Never share your OTP with anyone.<br/><br/>
      If you did not request this code, please ignore this email or contact our Support team:<br/>
      <a href="mailto:support@permitdesk.com">support@permitdesk.com</a><br/><br/>
      Warm regards,<br/>
      <strong>PERMITDESK Team</strong>
    `,

    help_link: 'mailto:support@permitdesk.com'
  };

  return generatePermitDeskEmailTemplate(metadata);
};

export interface ContactEmailData {
  fullName?: string | null;
  email: string;
  phoneNumber?: string | null;
  message?: string | null;
}

export const generateContactEmail = (contact: ContactEmailData) => {
  const metadata = {
    logo_url: logo_url,
    full_name: contact.fullName || 'N/A',
    email_address: contact.email || 'N/A',
    phone_number: contact.phoneNumber || 'N/A',
    message: contact.message || 'No message provided',
    social_instagram: process.env.SOCIAL_INSTAGRAM || '#',
    social_twitter: process.env.SOCIAL_TWITTER || '#',
    social_linkedin: process.env.SOCIAL_LINKEDIN || '#',
  };

  return generateContactEmailTemplate(metadata);
};