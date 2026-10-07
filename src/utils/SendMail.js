import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Transporte SMTP do Gmail. "service: gmail" já define host smtp.gmail.com e porta 465 (TLS).
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

class SendMail {
  static async enviaEmail(infoemail) {
    if (process.env.DISABLED_EMAIL === "true") {
      console.log("Serviço de Email desativado");
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to: infoemail.to,
        subject: infoemail.subject,
        text: infoemail.text,
        html: infoemail.html,
      });

      console.log("Email enviado: %s", info.messageId);
    } catch (err) {
      console.error("Erro ao enviar email:", err);
      return { error: true, code: 500, message: "Erro interno do Servidor" };
    }
  }
}

export default SendMail;
