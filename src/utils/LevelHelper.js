/**
 * Regras de progressão de nível.
 *
 * A curva é quadrática: cada nível exige progressivamente mais XP.
 * XP necessário para alcançar o nível n = BASE_XP * (n - 1)^2
 *
 * Ex.: nível 1 = 0 XP, nível 2 = 100 XP, nível 3 = 400 XP, nível 4 = 900 XP.
 */
const BASE_XP = 100;
const MIN_LEVEL = 1;
const MAX_LEVEL = 50;

/**
 * XP total necessário para alcançar um determinado nível.
 */
const xpForLevel = (level) => {
  if (level <= MIN_LEVEL) return 0;
  return BASE_XP * (level - 1) ** 2;
};

/**
 * Calcula o nível correspondente a um total de XP.
 * XP negativo é tratado como 0 (o aluno nunca cai abaixo do nível 1).
 */
const calculateLevel = (xp) => {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const level = Math.floor(Math.sqrt(safeXp / BASE_XP)) + 1;

  return Math.min(Math.max(level, MIN_LEVEL), MAX_LEVEL);
};

/**
 * Detalhes da progressão do aluno, usados para exibir a barra de progresso.
 */
const getProgress = (xp) => {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const level = calculateLevel(safeXp);

  if (level >= MAX_LEVEL) {
    return {
      xp: safeXp,
      level,
      current_level_xp: xpForLevel(MAX_LEVEL),
      next_level_xp: null,
      xp_to_next_level: 0,
      percentage: 100,
    };
  }

  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const range = nextLevelXp - currentLevelXp;

  return {
    xp: safeXp,
    level,
    current_level_xp: currentLevelXp,
    next_level_xp: nextLevelXp,
    xp_to_next_level: nextLevelXp - safeXp,
    percentage: Math.round(((safeXp - currentLevelXp) / range) * 100),
  };
};

export { BASE_XP, MIN_LEVEL, MAX_LEVEL, xpForLevel, calculateLevel, getProgress };
