export interface PermitDeskEmailTemplateData {
  title: string;
  main_message: string;
  logo_url: string;
  otp_code?: string;
  info_message?: string;
  cta_link?: string;
  cta_label?: string;
  help_link?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_linkedin?: string;
}

export const generatePermitDeskEmailTemplate = (
  data: PermitDeskEmailTemplateData
): string => {
  const {
    title,
    main_message,
    logo_url,
    otp_code,
    info_message,
    cta_link,
    cta_label,
    help_link,
    social_instagram = '#',
    social_twitter = '#',
    social_linkedin = '#',
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Fonts -->
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        font-family: "Inter", Arial, sans-serif;
      }
      .main-bg {
        background: linear-gradient(135deg, #fff5f2 0%, #f5f5f5 100%);
        min-height: 100vh;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 24px 0 rgba(226, 87, 28, 0.08),
          0 2px 10px 0 rgba(0, 0, 0, 0.06);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #e2571c 0%, #c44915 100%);
        padding: 36px 0 16px 0;
        text-align: center;
      }
      .brand-logo {
        width: 200px;
        max-width: 85%;
        margin-bottom: 10px;
        color: #fff;
      }
      .tagline {
        color: #fff;
        font-size: 15px;
        opacity: 0.9;
        font-weight: 400;
        margin-bottom: 0;
      }
      .hero-img {
        width: 220px;
        margin: 36px auto 16px auto;
        display: block;
        border-radius: 12px;
        box-shadow: 0 3px 14px rgba(226, 87, 28, 0.1);
      }
      .content {
        padding: 40px 40px 40px 40px;
      }
      .title {
        font-family: "Poppins", "Inter", sans-serif;
        font-size: 2rem;
        color: #1a1a1a;
        text-align: center;
        font-weight: 700;
        margin: 0 0 12px 0;
        line-height: 1.2;
      }
      .subtitle {
        font-size: 1.1rem;
        color: #e2571c;
        font-weight: 600;
        text-align: center;
        margin: 0 0 20px 0;
      }
      .main-message {
        font-size: 1rem;
        color: #333333;
        margin: 0 0 24px 0;
        text-align: center;
        line-height: 1.65;
      }
      .otp-box {
        background: linear-gradient(135deg, #fff5f2 0%, #ffe9e0 100%);
        border: 2px solid #e2571c;
        color: #e2571c;
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: 6px;
        text-align: center;
        border-radius: 12px;
        margin: 20px auto 28px auto;
        width: 85%;
        padding: 18px 0;
      }
      .cta-btn {
        display: block;
        background: linear-gradient(135deg, #e2571c 0%, #c44915 100%);
        color: #fff;
        text-decoration: none;
        font-size: 1.05rem;
        font-weight: 600;
        padding: 16px 0;
        border-radius: 8px;
        margin: 0 auto 14px auto;
        text-align: center;
        max-width: 340px;
        box-shadow: 0 4px 12px 0 rgba(226, 87, 28, 0.25);
        transition: all 0.3s ease;
      }
      .cta-btn:hover {
        background: linear-gradient(135deg, #c44915 0%, #a63d12 100%);
        box-shadow: 0 6px 16px 0 rgba(226, 87, 28, 0.35);
        transform: translateY(-1px);
      }
      .help-link {
        color: #e2571c;
        text-align: center;
        display: block;
        margin: 0 0 14px 0;
        text-decoration: underline;
        font-size: 0.95rem;
      }
      .help-link:hover {
        color: #c44915;
      }
      .info-box {
        background: #f8f8f8;
        border-left: 4px solid #e2571c;
        padding: 16px 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .info-box p {
        margin: 0;
        font-size: 0.95rem;
        color: #555;
        line-height: 1.6;
      }
      .footer {
        padding: 32px 20px;
        background: #1a1a1a;
        color: #fff;
        text-align: center;
      }
      .footer-logo {
        width: 140px;
        margin: 0 auto 16px auto;
      }
      .footer-links {
        margin: 18px 0 14px 0;
      }
      .footer-links a {
        color: #fff;
        opacity: 0.85;
        text-decoration: none;
        margin: 0 12px;
        font-size: 14px;
      }
      .footer-links a:hover {
        opacity: 1;
        text-decoration: underline;
      }
      .copyright {
        font-size: 13px;
        opacity: 0.7;
        margin-bottom: 0;
      }
      @media only screen and (max-width: 640px) {
        .container {
          max-width: 96%;
          margin: 20px auto;
          border-radius: 12px;
        }
        .content {
          padding: 0 24px 24px 24px;
        }
        .hero-img {
          width: 140px;
          margin: 28px auto 12px auto;
        }
        .title {
          font-size: 1.5rem;
        }
        .subtitle {
          font-size: 1rem;
        }
        .otp-box {
          font-size: 1.3rem;
          letter-spacing: 4px;
          padding: 14px 0;
        }
        .cta-btn {
          font-size: 1rem;
          padding: 14px 0;
        }
        .footer-logo {
          width: 120px;
        }
      }
    </style>
  </head>
  <body class="main-bg">
    <div class="container">
      <!-- Header with logo and tagline -->
      <div class="header">
        <img src="${logo_url}" alt="PERMITDESK Logo" class="brand-logo" />
      </div>

      <div class="content">
        <!-- Title and Subtitle -->
        <div class="title">${title}</div>

        <!-- Main message -->
        <div class="main-message">${main_message}</div>

        <!-- OTP Section (conditionally include) -->
        ${otp_code ? `<div class="otp-box">${otp_code}</div>` : ''}

        <!-- Info Box (optional additional info) -->
        ${info_message ? `<div class="info-box"><p>${info_message}</p></div>` : ''}

        <!-- CTA Button (conditionally include) -->
        ${cta_link && cta_label ? `<a href="${cta_link}" class="cta-btn">${cta_label}</a>` : ''}

        <!-- Secondary/Help Link (optional) -->
        ${help_link ? `<a href="${help_link}" class="help-link">Need help? Contact support</a>` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <img src="${logo_url}" alt="PERMITDESK Logo" class="footer-logo" />
      <div class="footer-links">
        <a href="${social_instagram}">Instagram</a> |
        <a href="${social_twitter}">Twitter</a> |
        <a href="${social_linkedin}">LinkedIn</a>
      </div>
      <div class="copyright">© 2025 PERMITDESK. All rights reserved.</div>
    </div>
      </body>
    </html>`;
};

export interface ContactEmailTemplateData {
  logo_url: string;
  full_name: string;
  email_address: string;
  phone_number: string;
  message: string;
  social_instagram?: string;
  social_twitter?: string;
  social_linkedin?: string;
}

export const generateContactEmailTemplate = (
  data: ContactEmailTemplateData
): string => {
  const {
    logo_url,
    full_name,
    email_address,
    phone_number,
    message,
    social_instagram = '#',
    social_twitter = '#',
    social_linkedin = '#',
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New Contact Form Submission</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Fonts -->
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        font-family: "Inter", Arial, sans-serif;
      }
      .main-bg {
        background: linear-gradient(135deg, #fff5f2 0%, #f5f5f5 100%);
        min-height: 100vh;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 24px 0 rgba(226, 87, 28, 0.08),
          0 2px 10px 0 rgba(0, 0, 0, 0.06);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #e2571c 0%, #c44915 100%);
        padding: 36px 0 24px 0;
        text-align: center;
      }
      .brand-logo {
        width: 200px;
        max-width: 85%;
        margin-bottom: 10px;
        color: #fff;
      }
      .tagline {
        color: #fff;
        font-size: 15px;
        opacity: 0.9;
        font-weight: 400;
        margin-bottom: 0;
      }
      .content {
        padding: 40px 40px 40px 40px;
      }
      .title {
        font-family: "Poppins", "Inter", sans-serif;
        font-size: 1.75rem;
        color: #1a1a1a;
        text-align: center;
        font-weight: 700;
        margin: 0 0 12px 0;
        line-height: 1.2;
      }
      .subtitle {
        font-size: 1rem;
        color: #666;
        font-weight: 400;
        text-align: center;
        margin: 0 0 32px 0;
      }
      .field-group {
        margin-bottom: 24px;
        border-bottom: 1px solid #efefef;
        padding-bottom: 24px;
      }
      .field-group:last-of-type {
        border-bottom: none;
        padding-bottom: 0;
      }
      .field-label {
        font-size: 0.75rem;
        color: #666;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 0 0 8px 0;
      }
      .field-value {
        font-size: 1rem;
        color: #1a1a1a;
        font-weight: 400;
        margin: 0;
        line-height: 1.5;
      }
      .field-value a {
        color: #e2571c;
        text-decoration: none;
        font-weight: 500;
      }
      .field-value a:hover {
        text-decoration: underline;
      }
      .message-box {
        background: linear-gradient(135deg, #fff5f2 0%, #ffe9e0 100%);
        border-left: 4px solid #e2571c;
        padding: 20px 24px;
        margin-top: 8px;
        border-radius: 8px;
      }
      .message-box p {
        margin: 0;
        font-size: 0.95rem;
        color: #333;
        line-height: 1.7;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .cta-btn {
        display: block;
        background: linear-gradient(135deg, #e2571c 0%, #c44915 100%);
        color: #fff;
        text-decoration: none;
        font-size: 1.05rem;
        font-weight: 600;
        padding: 16px 0;
        border-radius: 8px;
        margin: 32px auto 0 auto;
        text-align: center;
        max-width: 340px;
        box-shadow: 0 4px 12px 0 rgba(226, 87, 28, 0.25);
        transition: all 0.3s ease;
      }
      .cta-btn:hover {
        background: linear-gradient(135deg, #c44915 0%, #a63d12 100%);
        box-shadow: 0 6px 16px 0 rgba(226, 87, 28, 0.35);
        transform: translateY(-1px);
      }
      .info-box {
        background: #f8f8f8;
        border-left: 4px solid #e2571c;
        padding: 16px 20px;
        margin: 32px 0 0 0;
        border-radius: 4px;
      }
      .info-box p {
        margin: 0;
        font-size: 0.9rem;
        color: #555;
        line-height: 1.6;
      }
      .footer {
        padding: 32px 20px;
        background: #1a1a1a;
        color: #fff;
        text-align: center;
      }
      .footer-logo {
        width: 140px;
        margin: 0 auto 16px auto;
      }
      .footer-links {
        margin: 18px 0 14px 0;
      }
      .footer-links a {
        color: #fff;
        opacity: 0.85;
        text-decoration: none;
        margin: 0 12px;
        font-size: 14px;
      }
      .footer-links a:hover {
        opacity: 1;
        text-decoration: underline;
      }
      .copyright {
        font-size: 13px;
        opacity: 0.7;
        margin-bottom: 0;
      }
      @media only screen and (max-width: 640px) {
        .container {
          max-width: 96%;
          margin: 20px auto;
          border-radius: 12px;
        }
        .content {
          padding: 32px 24px 24px 24px;
        }
        .title {
          font-size: 1.4rem;
        }
        .subtitle {
          font-size: 0.9rem;
        }
        .field-value {
          font-size: 0.95rem;
        }
        .cta-btn {
          font-size: 1rem;
          padding: 14px 0;
        }
        .footer-logo {
          width: 120px;
        }
      }
    </style>
  </head>
  <body class="main-bg">
    <div class="container">
      <!-- Header with logo and tagline -->
      <div class="header">
        <img src="${logo_url}" alt="PERMITDESK Logo" class="brand-logo" />
      </div>

      <div class="content">
        <!-- Title and Subtitle -->
        <div class="title">New Contact Form Submission</div>
        <div class="subtitle">You have received a new message from your website</div>

        <!-- Contact Details -->
        <div class="field-group">
          <div class="field-label">Full Name</div>
          <div class="field-value">${full_name}</div>
        </div>

        <div class="field-group">
          <div class="field-label">Email Address</div>
          <div class="field-value">
            <a href="mailto:${email_address}">${email_address}</a>
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">Phone Number</div>
          <div class="field-value">
            <a href="tel:${phone_number}">${phone_number}</a>
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">Message</div>
          <div class="message-box">
            <p>${message}</p>
          </div>
        </div>

        <!-- CTA Button -->
        <a href="mailto:${email_address}" class="cta-btn">Reply to ${full_name}</a>

        <!-- Info Box -->
        <div class="info-box">
          <p>💡 This submission was received through your website's contact form. Make sure to respond within 24-48 hours for the best customer experience.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <img src="${logo_url}" alt="PERMITDESK Logo" class="footer-logo" />
      <div class="footer-links">
        <a href="${social_instagram}">Instagram</a> |
        <a href="${social_twitter}">Twitter</a> |
        <a href="${social_linkedin}">LinkedIn</a>
      </div>
      <div class="copyright">© 2025 PERMITDESK. All rights reserved.</div>
    </div>
  </body>
</html>`;
};