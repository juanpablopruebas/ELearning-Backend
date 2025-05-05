import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "node:path";
import "dotenv/config";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const sendEmail = async (options: EmailOptions) => {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, subject, template, data } = options;

  const templatePath = path.join(__dirname, `../mails/${template}`);

  const html = await ejs.renderFile(templatePath, data);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject,
    html,
  };

  await transport.sendMail(mailOptions);
};

export default sendEmail;
