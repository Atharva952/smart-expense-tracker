import nodemailer from "nodemailer";

let transporter;

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const getEnv = (...keys) => {
  for (const key of keys) {
    const value = clean(process.env[key]);
    if (value) return value;
  }
  return "";
};

const toBool = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
};

const getMailConfig = () => {
  const user = getEnv("SMTP_USER", "EMAIL", "MAIL_USER");
  const pass = getEnv("SMTP_PASS", "EMAIL_PASS", "MAIL_PASS");
  const host = getEnv("SMTP_HOST", "EMAIL_HOST", "MAIL_HOST");
  const portRaw = getEnv("SMTP_PORT", "EMAIL_PORT", "MAIL_PORT");
  const service = getEnv("SMTP_SERVICE", "EMAIL_SERVICE", "MAIL_SERVICE");
  const from = getEnv("SMTP_FROM", "EMAIL_FROM", "MAIL_FROM") || user;
  const secureRaw = getEnv("SMTP_SECURE", "EMAIL_SECURE", "MAIL_SECURE");

  return {
    user,
    pass,
    host,
    port: portRaw ? Number(portRaw) : null,
    service,
    from,
    secureRaw,
  };
};

const hasSmtpCredentials = () => {
  const { user, pass } = getMailConfig();
  return Boolean(user && pass);
};

const getTransporter = () => {
  if (transporter) return transporter;

  const { user, pass, host, port, service, secureRaw } = getMailConfig();

  if (!hasSmtpCredentials()) {
    return null;
  }

  if (service) {
    transporter = nodemailer.createTransport({
      service,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  }

  if (host && port) {
    const explicitSecure = toBool(secureRaw);
    const secure = explicitSecure === null ? port === 465 : explicitSecure;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  }

  // Auto-select common providers by email domain when service/host isn't set.
  const domain = user.split("@")[1]?.toLowerCase() || "";
  const inferredService = domain.includes("gmail")
    ? "gmail"
    : domain.includes("outlook") ||
        domain.includes("hotmail") ||
        domain.includes("live")
      ? "outlook"
      : domain.includes("yahoo")
        ? "yahoo"
        : "";

  if (!inferredService) {
    throw new Error(
      "SMTP config incomplete. Set SMTP_SERVICE or SMTP_HOST/SMTP_PORT.",
    );
  }

  transporter = nodemailer.createTransport({
    service: inferredService,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
};

export const sendOtpEmail = async ({ to, name, otp }) => {
  const currentTransporter = getTransporter();
  if (!currentTransporter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP is not configured. Add SMTP_USER/SMTP_PASS or EMAIL/EMAIL_PASS.",
      );
    }
    console.log(`[OTP] ${to} (${name}) -> ${otp}`);
    return {
      delivered: false,
      mode: "console",
      message:
        "SMTP not configured. OTP logged in server console. Configure SMTP_USER/SMTP_PASS or EMAIL/EMAIL_PASS to send real emails.",
    };
  }

  const { from } = getMailConfig();

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
    const message = error?.message || "Unknown SMTP error";
    const maybeAuthIssue =
      message.toLowerCase().includes("invalid login") ||
      message.toLowerCase().includes("authentication") ||
      message.toLowerCase().includes("username and password not accepted");

    throw new Error(
      maybeAuthIssue
        ? `Failed to send OTP email: ${message}. If using Gmail, use a 16-character App Password (not your normal Gmail password).`
        : `Failed to send OTP email: ${message}`,
    );
  }

  return { delivered: true, mode: "smtp" };
};
