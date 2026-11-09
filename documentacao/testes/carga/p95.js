import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL;
const NOMES = [
  "usuario", "missoes", "ranking_global", "ranking_me",
  "notificacoes", "turmas", "usuarios",
];

const thresholds = { http_req_failed: ["rate<0.01"] };
for (const nome of NOMES) {
  thresholds[`http_req_duration{name:${nome}}`] = ["p(95)<500"];
}

export const options = {
  stages: [
    { duration: "30s", target: 40 },
    { duration: "3m", target: 40 },
    { duration: "30s", target: 0 },
  ],
  thresholds,
};

function login(email) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password: __ENV.PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (res.status !== 200) throw new Error(`Login falhou: ${res.status}`);
  return res.json("data");
}

export function setup() {
  return {
    aluno: login(__ENV.ALUNO_EMAIL),
    professor: login(__ENV.PROFESSOR_EMAIL),
  };
}

function chamar(caminho, nome, token) {
  const res = http.get(`${BASE_URL}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: nome },
  });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}

export default function (sessao) {
  if (__VU % 10 === 0) {
    const token = sessao.professor.accessToken;
    chamar("/classes", "turmas", token);
    chamar("/users", "usuarios", token);
    return;
  }

  const token = sessao.aluno.accessToken;
  chamar(`/users/${sessao.aluno.user._id}`, "usuario", token);
  chamar("/missions", "missoes", token);
  chamar("/rankings/global", "ranking_global", token);
  chamar("/rankings/me", "ranking_me", token);
  chamar("/notifications/unread-count", "notificacoes", token);
}
