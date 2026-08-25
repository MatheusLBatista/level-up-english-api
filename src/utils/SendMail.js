import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const MAILERSEND_API_URL = "https://api.mailersend.com/v1/email";

class SendMail {
  static async enviaEmail(infoemail) {
    if (process.env.DISABLED_EMAIL === "true") {
      console.log("Serviço de Email desativado");
      return;
    }

    try {
      const hashId = () => crypto.randomBytes(6).toString("hex");

      const response = await fetch(MAILERSEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MAILERSEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: {
            email: process.env.MAILERSEND_FROM_EMAIL,
            name: process.env.MAILERSEND_FROM_NAME,
          },
          to: [{ email: infoemail.to }],
          subject: `${infoemail.subject} Email: #${hashId()}`,
          text: infoemail.text,
          html: infoemail.html,
        }),
      });

      if (!response.ok) {
        const detalhe = await response.text();
        throw new Error(`MailerSend respondeu ${response.status}: ${detalhe}`);
      }

      console.log("Email enviado: %s", response.headers.get("x-message-id"));
    } catch (err) {
      console.error("Erro ao enviar email:", err);
      return { error: true, code: 500, message: "Erro interno do Servidor" };
    }
  }
}

export default SendMail;
