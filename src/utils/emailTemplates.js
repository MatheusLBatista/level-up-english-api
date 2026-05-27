// src/utils/emailTemplates.js

export function forgotPasswordTemplate({ name, code, resetLink, expiresInMinutes = 30 }) {
  return {
    subject: "Redefinição de senha — LevelUp English",

    text:
      `Olá, ${name}!\n\n` +
      `Recebemos uma solicitação para redefinir a senha da sua conta no LevelUp English.\n\n` +
      `Seu código de recuperação é:\n\n${code}\n\n` +
      `Ou acesse o link abaixo para redefinir sua senha:\n${resetLink}\n\n` +
      `Este código expira em ${expiresInMinutes} minutos.\n\n` +
      `Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.\n\n` +
      `Equipe LevelUp English`,

    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c63ff,#48c6ef);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:1px;">🎮 LevelUp English</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Plataforma de Gamificação</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Olá, <strong>${name}</strong>!</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta.<br/>
                Use o código abaixo ou clique no botão para criar uma nova senha.
              </p>

              <!-- Code box -->
              <div style="background:#f0edff;border:2px dashed #6c63ff;border-radius:8px;padding:20px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Código de recuperação</p>
                <p style="margin:0;color:#6c63ff;font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace;">${code}</p>
              </div>

              <!-- CTA button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${resetLink}"
                   style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#48c6ef);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">
                  Redefinir minha senha
                </a>
              </div>

              <p style="margin:0 0 8px;color:#999;font-size:13px;text-align:center;">
                ⏱️ Este código expira em <strong>${expiresInMinutes} minutos</strong>.
              </p>
              <p style="margin:0;color:#bbb;font-size:12px;text-align:center;">
                Se você não solicitou a redefinição, ignore este e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">
                © 2025 LevelUp English · Todos os direitos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
