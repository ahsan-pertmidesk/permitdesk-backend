import sgMail from '@sendgrid/mail';
import { SEND_GRID_API, SEND_GRID_SENDER_EMAIL } from '../config/variables';

sgMail.setApiKey(SEND_GRID_API!);

export const sendEmail = async (
  email: string,
  subject: string,
  emailHtml: string,
) => {
  try {
    const msg = {
      to: email,
      from: SEND_GRID_SENDER_EMAIL!, // Your email or SendGrid verified sender
      subject: subject,
      html: emailHtml,
    };

    // Send the email via SendGrid
    
      await sgMail.send(msg);
      console.log('email sended ');
  
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Call the function inside an async wrapper
