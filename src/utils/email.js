import nodemailer from "nodemailer";

let transporter;

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const hasSmtpCredentials = () =>
  Boolean(clean(process.env.SMTP_USER) && clean(process.env.SMTP_PASS));

const getTransporter = () => {
  if (transporter) return transporter;

  const SMTP_USER = clean(process.env.SMTP_USER);
  const SMTP_PASS = clean(process.env.SMTP_PASS);
  const SMTP_HOST = clean(process.env.SMTP_HOST);
  const SMTP_PORT = Number(clean(process.env.SMTP_PORT));
  const SMTP_SERVICE = clean(process.env.SMTP_SERVICE);

  if (!hasSmtpCredentials()) {
    return null;
  }

  if (SMTP_SERVICE) {
    transporter = nodemailer.createTransport({
      service: SMTP_SERVICE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    return transporter;
  }

  if (SMTP_HOST && SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    return transporter;
  }

  // Default fallback for most users: Gmail app-password flow.
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

export const sendOtpEmail = async ({ to, name, otp }) => {
  const currentTransporter = getTransporter();
  if (!currentTransporter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured. Add SMTP_USER/SMTP_PASS.");
    }
    console.log(`[OTP] ${to} (${name}) -> ${otp}`);
    return {
      delivered: false,
      mode: "console",
      message:
        "SMTP not configured. OTP logged in server console. Configure SMTP_USER/SMTP_PASS to send real emails.",
    };
  }

  const from = clean(process.env.SMTP_FROM) || clean(process.env.SMTP_USER);

  try {
    await currentTransporter.sendMail({
      from,
      to,
      subject: "Verify your Expense Tracker account",
      text: `Hello ${name}, your OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color:#111827;">Verify your email</h2>
          <p>Hello ${name},</p>
          <p>Your one-time verification code is:</p>
          <div style="font-size:30px; font-weight:700; letter-spacing:6px; margin: 16px 0;">${otp}</div>
          <p>This OTP expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    throw new Error(
      `Failed to send OTP email: ${error?.message || "Unknown SMTP error"}`,
    );
  }

  return { delivered: true, mode: "smtp" };
};
