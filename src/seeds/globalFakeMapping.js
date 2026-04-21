import { faker } from "@faker-js/faker/locale/pt_BR";
import mongoose from "mongoose";
import loadModels from "./loadModels.js";
import Mission from "../models/Mission.js";
import Class from "../models/Class.js";
import Attitude from "../models/Attitude.js";

const fakeMappings = {
  common: {
    active: () => Math.random() < 0.9,
  },

  User: {
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
    password: () => faker.internet.password(),
    xp: () => faker.number.int({ min: 0, max: 10000 }),
    level: () => faker.number.int({ min: 1, max: 10 }),
    role: () => {
      const roles = ["student", "teacher", "admin"];
      return roles[Math.floor(Math.random() * roles.length)];
    },
    mission_progress: () => {
      const missions = [];
      const numMissions = faker.number.int({ min: 1, max: 5 });
      for (let i = 0; i < numMissions; i++) {
        missions.push({
          mission_id: new mongoose.Types.ObjectId().toString(),
          done: faker.datatype.boolean(),
          score: faker.number.int({ min: 0, max: 100 }),
        });
      }
      return missions;
    },
    streak: () => faker.number.int({ min: 0, max: 30 }),
    badges: () =>
      faker.helpers.arrayElements(
        ["beginner", "intermediate", "advanced", "veteran"],
        { min: 0, max: 4 },
      ),
    // TODO: after creating class, refer to it properly instead of generating random ObjectId
    class: () => new mongoose.Types.ObjectId().toString(),

    uniqueToken: () => "",
    accesstoken: () => "",
    refreshtoken: () => "",
    password_recovery_code: () => "",
    exp_password_recovery_code: () => undefined,
  },

  Mission: {
    title: () => faker.lorem.sentence({ min: 2, max: 5 }),
    description: () => faker.lorem.paragraph(),
    type: () => {
      const types = ["video", "quiz", "reading"];
      return types[Math.floor(Math.random() * types.length)];
    },
    content_url: () => faker.internet.url(),
    thumbnail: () => faker.image.url(),
    xp_reward: () => faker.number.int({ min: 10, max: 500 }),
    max_score: () => faker.number.int({ min: 10, max: 100 }),
    createdBy: () => new mongoose.Types.ObjectId().toString(),
  },

  Class: {
    name: () => faker.lorem.words({ min: 1, max: 3 }),
    teacher: () => new mongoose.Types.ObjectId().toString(),
    students: () => {
      const students = [];
      const numStudents = faker.number.int({ min: 5, max: 30 });
      for (let i = 0; i < numStudents; i++) {
        students.push(new mongoose.Types.ObjectId().toString());
      }
      return students;
    },
    missions: () => {
      const missions = [];
      const numMissions = faker.number.int({ min: 1, max: 10 });
      for (let i = 0; i < numMissions; i++) {
        missions.push(new mongoose.Types.ObjectId().toString());
      }
      return missions;
    },
  },

  Attitude: {
    name: () => faker.lorem.words({ min: 1, max: 3 }),
    description: () => faker.lorem.sentence(),
    xp_value: () => faker.number.int({ min: 10, max: 200 }),
    type: () => {
      const types = ["positive", "negative"];
      return types[Math.floor(Math.random() * types.length)];
    },
  },
};

/**
 * Retorna o mapping global, consolidando os mappings comuns e específicos.
 * Nesta versão automatizada, carregamos os models e combinamos o mapping comum com o mapping específico de cada model.
 */
export async function getGlobalFakeMapping(modelName = null) {
  if (modelName) {
    return {
      ...fakeMappings.common,
      ...(fakeMappings[modelName] || {}),
    };
  }

  const models = await loadModels();
  let globalMapping = { ...fakeMappings.common };

  models.forEach(({ name }) => {
    if (fakeMappings[name]) {
      globalMapping = {
        ...globalMapping,
        ...fakeMappings[name],
      };
    }
  });

  return globalMapping;
}

/**
 * Função auxiliar para extrair os nomes dos campos de um schema,
 * considerando apenas os níveis superiores (campos aninhados são verificados pela parte antes do ponto).
 */
function getSchemaFieldNames(schema) {
  const fieldNames = new Set();
  Object.keys(schema.paths).forEach((key) => {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(key)) return;
    const topLevel = key.split(".")[0];
    fieldNames.add(topLevel);
  });
  return Array.from(fieldNames);
}

/**
 * Valida se o mapping fornecido cobre todos os campos do model.
 * Retorna um array com os nomes dos campos que estiverem faltando.
 */
function validateModelMapping(model, modelName, mapping) {
  if (!model || !model.schema || !model.schema.paths) {
    console.warn(`⚠️  Model ${modelName} é inválido ou sem schema.paths.`);
    return [];
  }

  const fields = getSchemaFieldNames(model.schema);
  const missing = fields.filter((field) => !(field in mapping));
  if (missing.length > 0) {
    console.error(
      `Model ${modelName} está faltando mapeamento para os campos: ${missing.join(
        ", ",
      )}`,
    );
  } else {
    console.log(`Model ${modelName} possui mapeamento para todos os campos.`);
  }
  return missing;
}

/**
 * Executa a validação para os models fornecidos, utilizando o mapping específico de cada um.
 */
async function validateAllMappings() {
  const models = await loadModels();
  let totalMissing = {};

  models.forEach(({ model, name }) => {
    // Combina os campos comuns com os específicos de cada model
    const mapping = {
      ...fakeMappings.common,
      ...(fakeMappings[name] || {}),
    };
    const missing = validateModelMapping(model, name, mapping);
    if (missing.length > 0) {
      totalMissing[name] = missing;
    }
  });

  if (Object.keys(totalMissing).length === 0) {
    console.log("globalFakeMapping cobre todos os campos de todos os models.");
    return true;
  } else {
    console.warn("Faltam mapeamentos para os seguintes models:", totalMissing);
    return false;
  }
}

export { validateAllMappings };

export default getGlobalFakeMapping;
