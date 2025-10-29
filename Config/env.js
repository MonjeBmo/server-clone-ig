// server/Config/env.js
import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  jwtSecret: process.env.JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  recaptchaSecret: process.env.RECAPTCHA_SECRET_KEY,
};
