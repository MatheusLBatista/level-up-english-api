export const MISSION_TYPES = ["quiz", "vocabulary", "audio"];

export const summarizeByType = (progress, typeById) => {
  const totals = Object.fromEntries(MISSION_TYPES.map((type) => [type, { sum: 0, missions: 0 }]));

  for (const entry of progress) {
    const type = typeById.get(String(entry.mission_id));
    if (!entry.done || !type) continue;

    totals[type].sum += entry.score ?? 0;
    totals[type].missions += 1;
  }

  return Object.fromEntries(MISSION_TYPES.map((type) => {
    const { sum, missions } = totals[type];
    return [type, { score: missions ? Math.round(sum / missions) : null, missions }];
  }));
};

export const averageByType = (summaries) =>
  Object.fromEntries(MISSION_TYPES.map((type) => {
    const scores = summaries.map((summary) => summary[type].score).filter((score) => score !== null);
    const sum = scores.reduce((total, score) => total + score, 0);

    return [type, { score: scores.length ? Math.round(sum / scores.length) : null, students: scores.length }];
  }));
