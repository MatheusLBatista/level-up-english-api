import DataErasureLog, { ERASURE_REASONS } from "../../models/DataErasureLog.js";

describe("Model DataErasureLog", () => {
  const ALUNO_ID = "507f1f77bcf86cd799439004";

  it("deve aceitar os dois motivos previstos", () => {
    expect(ERASURE_REASONS).toEqual(["retention", "holder_request"]);

    ERASURE_REASONS.forEach((reason) => {
      expect(new DataErasureLog({ user: ALUNO_ID, reason }).validateSync()).toBeUndefined();
    });
  });

  it("deve exigir o usuário e o motivo", () => {
    const erro = new DataErasureLog({}).validateSync();

    expect(erro.errors.user).toBeDefined();
    expect(erro.errors.reason).toBeDefined();
  });

  it("deve recusar motivo fora da lista", () => {
    const erro = new DataErasureLog({ user: ALUNO_ID, reason: "qualquer" }).validateSync();

    expect(erro.errors.reason).toBeDefined();
  });

  it("deve preencher a data e deixar quem executou nulo quando for o job", () => {
    const log = new DataErasureLog({ user: ALUNO_ID, reason: "retention" });

    expect(log.performed_at).toBeInstanceOf(Date);
    expect(log.performed_by).toBeNull();
  });

  it("não deve ter campos de dado pessoal", () => {
    expect(Object.keys(DataErasureLog.schema.paths).sort()).toEqual(
      ["_id", "performed_at", "performed_by", "reason", "user"],
    );
  });
});
