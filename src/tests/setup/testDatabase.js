import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Banco em memória para os testes de integração.
 *
 * Cada arquivo de teste roda em um processo próprio do Jest, então cada um
 * levanta a sua própria instância e não disputa dados com os demais.
 */
let mongoServer;

export const connectTestDatabase = async() => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

/**
 * Limpa todas as coleções sem derrubar a conexão, para isolar um teste do outro.
 */
export const clearTestDatabase = async() => {
  const collections = mongoose.connection.collections;

  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
};

export const disconnectTestDatabase = async() => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
};
