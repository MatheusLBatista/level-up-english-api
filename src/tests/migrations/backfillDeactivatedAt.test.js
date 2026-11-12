import backfillDeactivatedAt from "../../migrations/backfillDeactivatedAt.js";
import User from "../../models/User.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("backfillDeactivatedAt", () => {
  const ATUALIZADO_EM = new Date("2026-03-15T10:00:00.000Z");
  const CRIADO_EM = new Date("2026-01-02T08:00:00.000Z");

  beforeAll(async() => {
    await connectTestDatabase();
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  beforeEach(async() => {
    await clearTestDatabase();
  });

  const inserir = async(dados) => {
    const { insertedId } = await User.collection.insertOne({ role: "student", ...dados });
    return insertedId;
  };

  const desativadoEm = async(id) => (await User.collection.findOne({ _id: id })).deactivated_at;

  it("deve usar o updatedAt como data de desativação dos usuários já inativos", async() => {
    const id = await inserir({ email: "a@escola.com", active: false, createdAt: CRIADO_EM, updatedAt: ATUALIZADO_EM });

    const alterados = await backfillDeactivatedAt();

    expect(alterados).toBe(1);
    expect(await desativadoEm(id)).toEqual(ATUALIZADO_EM);
  });

  it("deve manter o updatedAt do documento", async() => {
    const id = await inserir({ email: "a@escola.com", active: false, updatedAt: ATUALIZADO_EM });

    await backfillDeactivatedAt();

    expect((await User.collection.findOne({ _id: id })).updatedAt).toEqual(ATUALIZADO_EM);
  });

  it("deve cair para o createdAt quando não houver updatedAt", async() => {
    const id = await inserir({ email: "a@escola.com", active: false, createdAt: CRIADO_EM });

    await backfillDeactivatedAt();

    expect(await desativadoEm(id)).toEqual(CRIADO_EM);
  });

  it("deve usar a data atual quando o documento não tiver nenhuma das duas datas", async() => {
    const antes = Date.now();
    const id = await inserir({ email: "a@escola.com", active: false });

    await backfillDeactivatedAt();

    expect((await desativadoEm(id)).getTime()).toBeGreaterThanOrEqual(antes - 1000);
  });

  it("não deve tocar em usuários ativos nem em quem já tem deactivated_at", async() => {
    const ativo = await inserir({ email: "ativo@escola.com", active: true, updatedAt: ATUALIZADO_EM });
    const jaPreenchido = new Date("2026-05-01T00:00:00.000Z");
    const preenchido = await inserir({
      email: "inativo@escola.com",
      active: false,
      updatedAt: ATUALIZADO_EM,
      deactivated_at: jaPreenchido,
    });

    const alterados = await backfillDeactivatedAt();

    expect(alterados).toBe(0);
    expect(await desativadoEm(ativo)).toBeUndefined();
    expect(await desativadoEm(preenchido)).toEqual(jaPreenchido);
  });

  it("deve ser idempotente", async() => {
    await inserir({ email: "a@escola.com", active: false, updatedAt: ATUALIZADO_EM });

    await backfillDeactivatedAt();

    expect(await backfillDeactivatedAt()).toBe(0);
  });
});
