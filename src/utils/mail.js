import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: process.env.MAIL_FROM_NAME || "Project Management",
      // Points at the running app rather than a placeholder domain.
      link: process.env.CLIENT_URL || "http://localhost:5173",
    },
  });
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  // Any SMTP provider works. The MAILTRAP_ names are kept as a fallback so
  // an existing .env keeps working, but SMTP_ is the name to use.
  const host = process.env.SMTP_HOST || process.env.MAILTRAP_SMTP_HOST;
  const port =
    Number(process.env.SMTP_PORT || process.env.MAILTRAP_SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.MAILTRAP_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.MAILTRAP_SMTP_PASS;

  const transporter = nodemailer.createTransport({
    host,
    port,
    // 587 is STARTTLS, not implicit TLS; only 465 is secure-on-connect.
    secure: port === 465,
    auth: { user, pass },
  });

  // Providers reject a sender whose domain is not verified on the account,
  // so this must be configurable rather than a hardcoded placeholder.
  const fromAddress = process.env.MAIL_FROM_ADDRESS || "no-reply@example.com";
  const fromName = process.env.MAIL_FROM_NAME || "Project Management";

  const mail = {
    from: `"${fromName}" <${fromAddress}>`,
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      "Email service failed silently. make sure that you have provided correct credential in the .env file",
    );
    console.error(error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we are excited to have you",
      action: {
        instructions:
          "To verify your email please click on the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need Help, or have question just reply to this email, We are happy to help you",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account",
      action: {
        instructions:
          "To reset your password please click on the following button",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need Help, or have question just reply to this email, We are happy to help you",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
