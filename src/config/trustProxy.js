// Quantos proxies reversos ficam na frente da API (ex.: um nginx = 1). Sem a
// variável, ou com 0, o req.ip é o da conexão e o X-Forwarded-For é ignorado:
// confiar nele sem proxy deixaria o cliente escolher o próprio IP e driblar o
// rate limit do login.
export const trustProxyFromEnv = (value = process.env.TRUST_PROXY) => {
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
};
