import "dotenv/config";
import Ranking from "../models/Ranking.js";
import RankingService from "../service/RankingService.js";

async function rankingSeeds() {
  await Ranking.deleteMany();

  const service = new RankingService();

  const { global, classes } = await service.refreshFromUsers();

  console.log(
    `${classes.length + (global ? 1 : 0)} rankings inserted successfully!`,
  );

  return Ranking.find();
}

export default rankingSeeds;
