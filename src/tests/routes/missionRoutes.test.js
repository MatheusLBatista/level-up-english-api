import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";

import authRoutes from "../../routes/authRoutes.js";
import missionRoutes from "../../routes/missionRoutes.js";
import errorHandler from "../../utils/helpers/errorHandler.js";
import User from "../../models/User.js";
import Class from "../../models/Class.js";
import Mission from "../../models/Mission.js";
import Ranking from "../../models/Ranking.js";
import {
  connectTestDatabase,
  clearTestDatabase,
  disconnectTestDatabase,
} from "../setup/testDatabase.js";

describe("Rotas de missões", () => {
  let app;
  let senhaHash;
  let admin;
  let profA;
  let profB;
  let alunoA;
  let alunoB;
  let semTurma;
  let turmaA;
  let turmaB;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";

  const questoes = (total = 5, gabarito = "a") =>
    Array.from({ length: total }, (_, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "Blue", b: "Red", c: "Green", d: "Yellow" },
      correct_answer: gabarito,
    }));

  const TODAS_CERTAS = ["a", "a", "a", "a", "a"];

  beforeAll(async() => {
    await connectTestDatabase();

    senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);

    app = express();
    app.use(express.json());
    app.use(authRoutes);
    app.use(missionRoutes);
    app.use(errorHandler);
  });

  afterAll(async() => {
    await disconnectTestDatabase();
  });

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const criarMissao = async(autor, dados = {}) =>
    await request(app)
      .post("/missions")
      .set("Authorization", await como(autor))
      .send({
        title: "Explorador de Palavras",
        type: "quiz",
        xp_reward: 100,
        class_id: String(turmaA._id),
        questions: questoes(),
        ...dados,
      });

  const xpDe = async(usuario) => (await User.findById(usuario._id)).xp;

  const missoesDaTurma = async(turma) =>
    (await Class.findById(turma._id)).missions.map(String);

  beforeEach(async() => {
    jest.clearAllMocks();
    await clearTestDatabase();

    admin = await criarUsuario({ name: "Admin", email: "admin@escola.com", role: "admin" });
    profA = await criarUsuario({ name: "Professora A", email: "profa@escola.com", role: "teacher" });
    profB = await criarUsuario({ name: "Professora B", email: "profb@escola.com", role: "teacher" });

    turmaA = await Class.create({ name: "Turma A", teacher: profA._id });
    turmaB = await Class.create({ name: "Turma B", teacher: profB._id });

    alunoA = await criarUsuario({ name: "Aluno A", email: "alunoa@escola.com", class: turmaA._id });
    alunoB = await criarUsuario({ name: "Aluno B", email: "alunob@escola.com", class: turmaB._id });
    semTurma = await criarUsuario({ name: "Sem turma", email: "semturma@escola.com" });
  });

  describe("POST /missions", () => {
    it("deve criar a missão registrando quem criou", async() => {
      const res = await criarMissao(profA);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Recurso criado com sucesso");

      const missao = await Mission.findById(res.body.data._id);
      expect(String(missao.createdBy)).toBe(String(profA._id));
      expect(String(missao.class_id)).toBe(String(turmaA._id));
      expect(missao.active).toBe(true);
    });

    it("deve vincular a missão à turma", async() => {
      const res = await criarMissao(profA);

      expect(await missoesDaTurma(turmaA)).toContain(res.body.data._id);
    });

    it("deve criar missão de vocabulário com conteúdo", async() => {
      const res = await criarMissao(profA, {
        title: "Animais",
        type: "vocabulary",
        content: "cat, dog, bird",
        questions: undefined,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe("cat, dog, bird");
    });

    it("deve criar missão de áudio com URL", async() => {
      const res = await criarMissao(profA, {
        title: "Escuta ativa",
        type: "audio",
        content_url: "https://www.youtube.com/embed/abc123",
        questions: undefined,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.content_url).toBe("https://www.youtube.com/embed/abc123");
    });

    it("deve retornar 403 quando a turma não for da professora", async() => {
      const res = await criarMissao(profA, { class_id: String(turmaB._id) });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode criar missões nas suas turmas.");
      expect(await Mission.countDocuments()).toBe(0);
    });

    it("deve permitir que o admin crie missão em qualquer turma", async() => {
      const res = await criarMissao(admin, { class_id: String(turmaB._id) });

      expect(res.status).toBe(201);
      expect(await missoesDaTurma(turmaB)).toContain(res.body.data._id);
    });

    it("deve retornar 404 quando a turma não existir", async() => {
      const res = await criarMissao(admin, { class_id: ID_INEXISTENTE });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Turma não encontrada.");
    });

    it("deve retornar 400 quando o título já estiver cadastrado", async() => {
      await criarMissao(profA);

      const res = await criarMissao(profA, { title: "explorador de palavras" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Título já cadastrado.");
      expect(await Mission.countDocuments()).toBe(1);
    });

    it("deve retornar 400 quando o quiz tiver menos de cinco perguntas", async() => {
      const res = await criarMissao(profA, { questions: questoes(4) });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toBe(
        "Missões do tipo quiz precisam de no mínimo 5 perguntas.",
      );
    });

    it("deve retornar 400 quando o corpo vier vazio", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(profA))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it("deve retornar 403 quando quem cria é um aluno", async() => {
      const res = await criarMissao(alunoA);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/missions").send({ title: "Sem token" });

      expect(res.status).toBe(498);
    });
  });

  describe("GET /missions", () => {
    beforeEach(async() => {
      await criarMissao(profA);
      await criarMissao(profA, { title: "Ouvindo o mundo", type: "audio", content_url: "https://exemplo.com/a.mp3", questions: undefined });
      await criarMissao(admin, { title: "Missão da Turma B", class_id: String(turmaB._id) });
    });

    it("deve listar todas as missões para o admin", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(3);
    });

    it("deve popular o nome da turma e de quem criou", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(admin));

      const missao = res.body.data.docs[0];
      expect(missao.class_id.name).toEqual(expect.any(String));
      expect(missao.createdBy.name).toEqual(expect.any(String));
    });

    it("deve mostrar ao aluno apenas as missões da turma dele", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
      expect(res.body.data.docs.every((missao) => missao.class_id.name === "Turma A")).toBe(true);
    });

    it("deve esconder o gabarito das missões listadas para o aluno", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(alunoA));

      const quiz = res.body.data.docs.find((missao) => missao.type === "quiz");
      expect(quiz.questions).toHaveLength(5);
      expect(quiz.questions[0]).not.toHaveProperty("correct_answer");
      expect(quiz.questions[0].options.a).toBe("Blue");
    });

    it("deve manter o gabarito visível para a professora", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(profA));

      const quiz = res.body.data.docs.find((missao) => missao.type === "quiz");
      expect(quiz.questions[0].correct_answer).toBe("a");
    });

    it("deve ignorar a turma que o aluno tentar forçar na query", async() => {
      const res = await request(app)
        .get(`/missions?class_id=${turmaB._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve devolver lista vazia para o aluno sem turma", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(semTurma));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(0);
      expect(res.body.data.totalDocs).toBe(0);
    });

    it("deve filtrar por trecho do título", async() => {
      const res = await request(app)
        .get("/missions?title=explorador")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].title).toBe("Explorador de Palavras");
    });

    it("deve filtrar por tipo", async() => {
      const res = await request(app)
        .get("/missions?type=audio")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
    });

    it("deve filtrar por turma", async() => {
      const res = await request(app)
        .get(`/missions?class_id=${turmaB._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].title).toBe("Missão da Turma B");
    });

    it("deve filtrar as missões inativas", async() => {
      await Mission.findOneAndUpdate({ title: "Ouvindo o mundo" }, { active: false });

      const res = await request(app)
        .get("/missions?active=false")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].title).toBe("Ouvindo o mundo");
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/missions?page=1&limit=2")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(2);
      expect(res.body.data.totalPages).toBe(2);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/missions");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /missions/:id", () => {
    let missaoId;

    beforeEach(async() => {
      const criada = await criarMissao(profA);
      missaoId = criada.body.data._id;
    });

    it("deve devolver a missão com o gabarito para a professora", async() => {
      const res = await request(app)
        .get(`/missions/${missaoId}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Explorador de Palavras");
      expect(res.body.data.questions[0].correct_answer).toBe("a");
    });

    it("deve esconder o gabarito do aluno da turma", async() => {
      const res = await request(app)
        .get(`/missions/${missaoId}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.questions[0]).not.toHaveProperty("correct_answer");
    });

    it("deve retornar 403 quando o aluno for de outra turma", async() => {
      const res = await request(app)
        .get(`/missions/${missaoId}`)
        .set("Authorization", await como(alunoB));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você não tem acesso a esta missão.");
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await request(app)
        .get(`/missions/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Mission.");
    });
  });

  describe("PATCH /missions/:id", () => {
    let missaoId;

    beforeEach(async() => {
      const criada = await criarMissao(profA);
      missaoId = criada.body.data._id;
    });

    const editar = async(autor, dados) =>
      await request(app)
        .patch(`/missions/${missaoId}`)
        .set("Authorization", await como(autor))
        .send(dados);

    it("deve atualizar a missão criada pela própria professora", async() => {
      const res = await editar(profA, { xp_reward: 150 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Missão atualizada com sucesso.");
      expect((await Mission.findById(missaoId)).xp_reward).toBe(150);
    });

    it("deve permitir desativar a missão", async() => {
      const res = await editar(profA, { active: false });

      expect(res.status).toBe(200);
      expect((await Mission.findById(missaoId)).active).toBe(false);
    });

    it("deve retornar 403 quando a professora não criou a missão", async() => {
      const res = await editar(profB, { xp_reward: 150 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode editar missões que criou.");
      expect((await Mission.findById(missaoId)).xp_reward).toBe(100);
    });

    it("deve permitir que o admin edite missão de qualquer professora", async() => {
      const res = await editar(admin, { xp_reward: 150 });

      expect(res.status).toBe(200);
      expect((await Mission.findById(missaoId)).xp_reward).toBe(150);
    });

    it("deve retornar 400 quando o novo título já for de outra missão", async() => {
      await criarMissao(profA, { title: "Outra Missão" });

      const res = await editar(profA, { title: "Outra Missão" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Título já cadastrado.");
    });

    it("deve aceitar o mesmo título da própria missão", async() => {
      const res = await editar(profA, { title: "Explorador de Palavras" });

      expect(res.status).toBe(200);
    });

    it("deve mover a missão entre as turmas ao trocar de turma", async() => {
      const res = await editar(admin, { class_id: String(turmaB._id) });

      expect(res.status).toBe(200);
      expect(await missoesDaTurma(turmaA)).not.toContain(missaoId);
      expect(await missoesDaTurma(turmaB)).toContain(missaoId);
    });

    it("deve retornar 403 ao mover a missão para turma de outra professora", async() => {
      const res = await editar(profA, { class_id: String(turmaB._id) });

      expect(res.status).toBe(403);
      expect(await missoesDaTurma(turmaA)).toContain(missaoId);
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await request(app)
        .patch(`/missions/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ xp_reward: 150 });

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem edita é um aluno", async() => {
      const res = await editar(alunoA, { xp_reward: 150 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).patch(`/missions/${missaoId}`).send({ xp_reward: 150 });

      expect(res.status).toBe(498);
    });
  });

  describe("POST /missions/:id/progress", () => {
    let missaoId;

    beforeEach(async() => {
      const criada = await criarMissao(profA);
      missaoId = criada.body.data._id;
    });

    const responder = async(autor, corpo, id = missaoId) =>
      await request(app)
        .post(`/missions/${id}/progress`)
        .set("Authorization", await como(autor))
        .send(corpo);

    const progressoDe = async(usuario) =>
      (await User.findById(usuario._id)).mission_progress[0];

    it("deve apurar o score do quiz e creditar o XP", async() => {
      const res = await responder(alunoA, { answers: TODAS_CERTAS });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Progresso registrado com sucesso.");
      expect(res.body.data).toMatchObject({
        score: 100,
        correct_answers: 5,
        total_questions: 5,
        xp_earned: 100,
        already_rewarded: false,
      });
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("deve creditar XP proporcional aos acertos", async() => {
      const res = await responder(alunoA, { answers: ["a", "a", "a", "a", "b"] });

      expect(res.body.data.score).toBe(80);
      expect(res.body.data.xp_earned).toBe(80);
      expect(await xpDe(alunoA)).toBe(80);
    });

    it("deve gravar o progresso do aluno na missão", async() => {
      await responder(alunoA, { answers: TODAS_CERTAS });

      const progresso = await progressoDe(alunoA);
      expect(String(progresso.mission_id)).toBe(missaoId);
      expect(progresso.done).toBe(true);
      expect(progresso.score).toBe(100);
      expect(progresso.xp_earned).toBe(100);
      expect(progresso.completed_at).not.toBeNull();
    });

    it("deve subir o nível do aluno ao concluir a missão", async() => {
      const res = await responder(alunoA, { answers: TODAS_CERTAS });

      expect(res.body.data.progression.leveled_up).toBe(true);
      expect((await User.findById(alunoA._id)).level).toBe(2);
    });

    it("deve atualizar o ranking após creditar o XP", async() => {
      await responder(alunoA, { answers: TODAS_CERTAS });

      const global = await Ranking.findOne({ type: "global" });
      const entrada = global.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(entrada.xp).toBe(100);
    });

    it("deve creditar só a diferença quando o aluno refizer a missão melhor", async() => {
      await responder(alunoA, { answers: ["a", "a", "a", "a", "b"] });

      const res = await responder(alunoA, { answers: TODAS_CERTAS });

      expect(res.body.data.xp_earned).toBe(20);
      expect(res.body.data.credited_so_far).toBe(100);
      expect(res.body.data.already_rewarded).toBe(true);
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("não deve estornar XP quando o aluno refizer a missão pior", async() => {
      await responder(alunoA, { answers: TODAS_CERTAS });

      const res = await responder(alunoA, { answers: ["a", "a", "b", "b", "b"] });

      expect(res.body.data.score).toBe(40);
      expect(res.body.data.xp_earned).toBe(0);
      expect(res.body.data.progression).toBeNull();
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("deve guardar uma única entrada de progresso por missão", async() => {
      await responder(alunoA, { answers: TODAS_CERTAS });
      await responder(alunoA, { answers: TODAS_CERTAS });

      expect((await User.findById(alunoA._id)).mission_progress).toHaveLength(1);
    });

    it("não deve creditar XP quando a missão não for marcada como concluída", async() => {
      const res = await responder(alunoA, { answers: TODAS_CERTAS, done: false });

      expect(res.body.data.xp_earned).toBe(0);
      expect(res.body.data.score).toBe(100);
      expect(await xpDe(alunoA)).toBe(0);
      expect((await progressoDe(alunoA)).done).toBe(false);
    });

    it("deve usar o score enviado nas missões de vocabulário", async() => {
      const criada = await criarMissao(profA, {
        title: "Animais",
        type: "vocabulary",
        content: "cat, dog",
        questions: undefined,
      });

      const res = await responder(alunoA, { score: 50 }, criada.body.data._id);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        score: 50,
        correct_answers: null,
        total_questions: null,
        xp_earned: 50,
      });
    });

    it("deve retornar 400 quando faltar o score em missão que não é quiz", async() => {
      const criada = await criarMissao(profA, {
        title: "Animais",
        type: "vocabulary",
        content: "cat, dog",
        questions: undefined,
      });

      const res = await responder(alunoA, {}, criada.body.data._id);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "O score é obrigatório para missões que não são do tipo quiz.",
      );
    });

    it("deve retornar 400 quando o número de respostas não bater", async() => {
      const res = await responder(alunoA, { answers: ["a", "b"] });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Envie exatamente 5 respostas, na ordem das questões.");
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 400 quando a missão estiver inativa", async() => {
      await Mission.findByIdAndUpdate(missaoId, { active: false });

      const res = await responder(alunoA, { answers: TODAS_CERTAS });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Esta missão está inativa.");
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 400 quando o score enviado for inválido", async() => {
      const res = await responder(alunoA, { score: 120 });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].message).toBe("O score máximo é 100.");
    });

    it("deve retornar 403 quando a missão for de outra turma", async() => {
      const res = await responder(alunoB, { answers: TODAS_CERTAS });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você não tem acesso a esta missão.");
      expect(await xpDe(alunoB)).toBe(0);
    });

    it("deve retornar 403 quando quem responde é a professora", async() => {
      const res = await responder(profA, { answers: TODAS_CERTAS });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await responder(alunoA, { answers: TODAS_CERTAS }, ID_INEXISTENTE);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Recurso não encontrado em Mission.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .post(`/missions/${missaoId}/progress`)
        .send({ answers: TODAS_CERTAS });

      expect(res.status).toBe(498);
    });
  });

  describe("DELETE /missions/:id", () => {
    let missaoId;

    beforeEach(async() => {
      const criada = await criarMissao(profA);
      missaoId = criada.body.data._id;
    });

    it("deve excluir a missão criada pela própria professora", async() => {
      const res = await request(app)
        .delete(`/missions/${missaoId}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Missão excluída com sucesso.");
      expect(res.body.data).toBeNull();
      expect(await Mission.findById(missaoId)).toBeNull();
    });

    it("deve desvincular a missão da turma", async() => {
      await request(app).delete(`/missions/${missaoId}`).set("Authorization", await como(profA));

      expect(await missoesDaTurma(turmaA)).not.toContain(missaoId);
    });

    it("deve retornar 403 quando a professora não criou a missão", async() => {
      const res = await request(app)
        .delete(`/missions/${missaoId}`)
        .set("Authorization", await como(profB));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode excluir missões que criou.");
      expect(await Mission.findById(missaoId)).not.toBeNull();
    });

    it("deve permitir que o admin exclua missão de qualquer professora", async() => {
      const res = await request(app)
        .delete(`/missions/${missaoId}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(await Mission.findById(missaoId)).toBeNull();
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await request(app)
        .delete(`/missions/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem exclui é um aluno", async() => {
      const res = await request(app)
        .delete(`/missions/${missaoId}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
      expect(await Mission.findById(missaoId)).not.toBeNull();
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/missions/${missaoId}`);

      expect(res.status).toBe(498);
    });
  });
});
