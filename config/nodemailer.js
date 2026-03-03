import nodemailer from "nodemailer";
import { EMAIL_PASSWORD } from "./env.js";

export const ACCOUNT_EMAIL = 'af38765220@gmail.com';

// Create The Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ACCOUNT_EMAIL,
        pass: EMAIL_PASSWORD
    }
})

export default transporter;
