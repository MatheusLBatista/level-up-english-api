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
  let quiz;
  let vocabulario;

  const SENHA_PADRAO = "senha123";
  const ID_INEXISTENTE = "507f1f77bcf86cd799439011";
  const GABARITO = ["a", "b", "c", "d", "a"];

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

    quiz = await Mission.create({
      title: "Quiz de Cores",
      type: "quiz",
      xp_reward: 100,
      class_id: turmaA._id,
      createdBy: profA._id,
      questions: questoes(),
    });

    vocabulario = await Mission.create({
      title: "Animais",
      type: "vocabulary",
      content: "cat, dog, bird",
      xp_reward: 50,
      class_id: turmaA._id,
      createdBy: profA._id,
    });
  });

  const questoes = (gabarito = GABARITO) =>
    gabarito.map((correct_answer, index) => ({
      question: `Pergunta ${index + 1}`,
      options: { a: "A", b: "B", c: "C", d: "D" },
      correct_answer,
    }));

  const criarUsuario = async(dados = {}) =>
    await User.create({ password: senhaHash, role: "student", ...dados });

  const autenticar = async(email) => {
    const res = await request(app).post("/auth/login").send({ email, password: SENHA_PADRAO });
    expect(res.status).toBe(200);
    return res.body.data.accessToken;
  };

  const como = async(usuario) => `Bearer ${await autenticar(usuario.email)}`;

  const submeter = async(aluno, missao, corpo) =>
    await request(app)
      .post(`/missions/${missao._id}/progress`)
      .set("Authorization", await como(aluno))
      .send(corpo);

  const xpDe = async(usuario) => (await User.findById(usuario._id)).xp;

  describe("GET /missions", () => {
    it("deve listar todas as missões para o admin", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(admin));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve entregar o gabarito para a professora", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(profA));

      const missao = res.body.data.docs.find((doc) => doc.type === "quiz");
      expect(missao.questions[0].correct_answer).toBe("a");
    });

    it("deve esconder o gabarito do aluno", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(alunoA));

      const missao = res.body.data.docs.find((doc) => doc.type === "quiz");
      expect(missao.questions).toHaveLength(5);
      missao.questions.forEach((questao) => {
        expect(questao).not.toHaveProperty("correct_answer");
        expect(questao.options.a).toBe("A");
      });
    });

    it("deve devolver ao aluno apenas as missões da turma dele", async() => {
      await Mission.create({
        title: "Missão da Turma B",
        type: "vocabulary",
        content: "texto",
        class_id: turmaB._id,
        createdBy: profB._id,
      });

      const res = await request(app).get("/missions").set("Authorization", await como(alunoA));

      expect(res.body.data.docs).toHaveLength(2);
      expect(res.body.data.docs.map((doc) => doc.title)).not.toContain("Missão da Turma B");
    });

    it("não deve deixar o aluno alcançar outra turma pela querystring", async() => {
      const res = await request(app)
        .get(`/missions?class_id=${turmaB._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.body.data.docs).toHaveLength(2);
    });

    it("deve devolver lista vazia para o aluno sem turma", async() => {
      const res = await request(app).get("/missions").set("Authorization", await como(semTurma));

      expect(res.status).toBe(200);
      expect(res.body.data.docs).toEqual([]);
    });

    it("deve filtrar por tipo", async() => {
      const res = await request(app)
        .get("/missions?type=quiz")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.docs[0].title).toBe("Quiz de Cores");
    });

    it("deve filtrar por turma", async() => {
      const res = await request(app)
        .get(`/missions?class_id=${turmaB._id}`)
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toEqual([]);
    });

    it("deve paginar o resultado", async() => {
      const res = await request(app)
        .get("/missions?page=1&limit=1")
        .set("Authorization", await como(admin));

      expect(res.body.data.docs).toHaveLength(1);
      expect(res.body.data.totalPages).toBe(2);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).get("/missions");

      expect(res.status).toBe(498);
    });
  });

  describe("GET /missions/:id", () => {
    it("deve devolver a missão com a turma e a autora populadas", async() => {
      const res = await request(app)
        .get(`/missions/${quiz._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.data.class_id.name).toBe("Turma A");
      expect(res.body.data.createdBy.name).toBe("Professora A");
    });

    it("deve esconder o gabarito do aluno da turma", async() => {
      const res = await request(app)
        .get(`/missions/${quiz._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(200);
      expect(res.body.data.questions[0]).not.toHaveProperty("correct_answer");
    });

    it("deve retornar 403 quando a missão não for da turma do aluno", async() => {
      const res = await request(app)
        .get(`/missions/${quiz._id}`)
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

  describe("POST /missions", () => {
    const nova = { title: "Nova Missão", type: "vocabulary", content: "texto", xp_reward: 30 };

    it("deve criar a missão e anexá-la à turma", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(profA))
        .send({ ...nova, class_id: String(turmaA._id) });

      expect(res.status).toBe(201);
      expect(res.body.data.createdBy).toBe(String(profA._id));

      const turma = await Class.findById(turmaA._id);
      expect(turma.missions.map(String)).toContain(res.body.data._id);
    });

    it("deve retornar 403 quando a turma não for da professora", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(profA))
        .send({ ...nova, class_id: String(turmaB._id) });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode criar missões nas suas turmas.");
      expect(await Mission.findOne({ title: nova.title })).toBeNull();
    });

    it("deve permitir que o admin crie missão em qualquer turma", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(admin))
        .send({ ...nova, class_id: String(turmaB._id) });

      expect(res.status).toBe(201);
    });

    it("deve retornar 404 quando a turma não existir", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(admin))
        .send({ ...nova, class_id: ID_INEXISTENTE });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Turma não encontrada.");
    });

    it("deve retornar 400 quando o título já existir", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(profA))
        .send({ ...nova, title: "Animais", class_id: String(turmaA._id) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Título já cadastrado.");
    });

    it("deve retornar 400 quando o quiz tiver menos de cinco questões", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(profA))
        .send({
          title: "Quiz Curto",
          type: "quiz",
          class_id: String(turmaA._id),
          questions: questoes(["a", "b"]),
        });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].path).toBe("questions");
    });

    it("deve retornar 403 quando quem cria é um aluno", async() => {
      const res = await request(app)
        .post("/missions")
        .set("Authorization", await como(alunoA))
        .send({ ...nova, class_id: String(turmaA._id) });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).post("/missions").send(nova);

      expect(res.status).toBe(498);
    });
  });

  describe("POST /missions/:id/progress", () => {
    it("deve corrigir o quiz e creditar o XP proporcional", async() => {
      const res = await submeter(alunoA, quiz, { answers: GABARITO });

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.correct_answers).toBe(5);
      expect(res.body.data.xp_earned).toBe(100);
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("deve creditar proporcionalmente ao acerto parcial", async() => {
      const res = await submeter(alunoA, quiz, { answers: ["a", "b", "c", "a", "b"] });

      expect(res.body.data.score).toBe(60);
      expect(res.body.data.xp_earned).toBe(60);
      expect(await xpDe(alunoA)).toBe(60);
    });

    it("deve ignorar o score enviado pelo aluno no quiz", async() => {
      const res = await submeter(alunoA, quiz, {
        score: 100,
        answers: ["a", "b", "c", "a", "b"],
      });

      // Quem corrige é o servidor; o score do corpo é descartado.
      expect(res.body.data.score).toBe(60);
      expect(await xpDe(alunoA)).toBe(60);
    });

    it("deve gravar o progresso no aluno", async() => {
      await submeter(alunoA, quiz, { answers: GABARITO });

      const salvo = await User.findById(alunoA._id);
      const progresso = salvo.mission_progress[0];
      expect(String(progresso.mission_id)).toBe(String(quiz._id));
      expect(progresso.done).toBe(true);
      expect(progresso.score).toBe(100);
      expect(progresso.xp_earned).toBe(100);
      expect(progresso.completed_at).toBeInstanceOf(Date);
    });

    it("deve pagar apenas a diferença quando o aluno refaz e melhora", async() => {
      await submeter(alunoA, quiz, { answers: ["a", "b", "c", "a", "b"] });

      const res = await submeter(alunoA, quiz, { answers: GABARITO });

      expect(res.body.data.xp_earned).toBe(40);
      expect(res.body.data.credited_so_far).toBe(100);
      expect(res.body.data.already_rewarded).toBe(true);
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("não deve pagar de novo quando o aluno refaz e piora", async() => {
      await submeter(alunoA, quiz, { answers: GABARITO });

      const res = await submeter(alunoA, quiz, { answers: ["a", "b", "c", "a", "b"] });

      expect(res.body.data.xp_earned).toBe(0);
      expect(res.body.data.progression).toBeNull();
      expect(await xpDe(alunoA)).toBe(100);
    });

    it("deve exigir o score em missão que não é quiz", async() => {
      const res = await submeter(alunoA, vocabulario, {});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("O score é obrigatório para missões que não são do tipo quiz.");
    });

    it("deve aceitar o score informado em missão de vocabulário", async() => {
      const res = await submeter(alunoA, vocabulario, { score: 80 });

      expect(res.status).toBe(200);
      expect(res.body.data.correct_answers).toBeNull();
      // 80% de 50 de recompensa.
      expect(res.body.data.xp_earned).toBe(40);
    });

    it("deve retornar 400 quando faltarem respostas no quiz", async() => {
      const res = await submeter(alunoA, quiz, { answers: ["a", "b"] });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Envie exatamente 5 respostas, na ordem das questões.");
    });

    it("não deve pagar XP quando a missão não for concluída", async() => {
      const res = await submeter(alunoA, quiz, { answers: GABARITO, done: false });

      expect(res.body.data.xp_earned).toBe(0);
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve subir o nível do aluno quando o XP cruzar a faixa", async() => {
      const res = await submeter(alunoA, quiz, { answers: GABARITO });

      expect(res.body.data.progression.leveled_up).toBe(true);
      expect(res.body.data.progression.level).toBe(2);
      expect((await User.findById(alunoA._id)).level).toBe(2);
    });

    it("deve atualizar o ranking após creditar o XP", async() => {
      await submeter(alunoA, quiz, { answers: GABARITO });

      const global = await Ranking.findOne({ type: "global" });
      const entrada = global.entries.find((item) => String(item.user) === String(alunoA._id));
      expect(entrada.xp).toBe(100);
    });

    it("deve retornar 400 quando a missão estiver inativa", async() => {
      await Mission.findByIdAndUpdate(quiz._id, { active: false });

      const res = await submeter(alunoA, quiz, { answers: GABARITO });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Esta missão está inativa.");
      expect(await xpDe(alunoA)).toBe(0);
    });

    it("deve retornar 403 quando a missão não for da turma do aluno", async() => {
      const res = await submeter(alunoB, quiz, { answers: GABARITO });

      expect(res.status).toBe(403);
      expect(await xpDe(alunoB)).toBe(0);
    });

    it("deve retornar 403 quando quem submete é uma professora", async() => {
      const res = await submeter(profA, quiz, { answers: GABARITO });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Permissão insuficiente para executar a operação.");
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app)
        .post(`/missions/${quiz._id}/progress`)
        .send({ answers: GABARITO });

      expect(res.status).toBe(498);
    });
  });

  describe("PATCH /missions/:id", () => {
    it("deve permitir que a autora atualize a missão", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(profA))
        .send({ xp_reward: 200 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Missão atualizada com sucesso.");
      expect(res.body.data.xp_reward).toBe(200);
    });

    it("deve retornar 403 quando a professora não criou a missão", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(profB))
        .send({ xp_reward: 999 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode editar missões que criou.");
    });

    it("deve permitir que o admin atualize missão de qualquer professora", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(admin))
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe(false);
    });

    it("deve mover a referência da missão ao trocar de turma", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(admin))
        .send({ class_id: String(turmaB._id) });

      expect(res.status).toBe(200);

      const origem = await Class.findById(turmaA._id);
      const destino = await Class.findById(turmaB._id);
      expect(origem.missions.map(String)).not.toContain(String(quiz._id));
      expect(destino.missions.map(String)).toContain(String(quiz._id));
    });

    it("deve retornar 400 quando o título novo já for de outra missão", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(profA))
        .send({ title: "Animais" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Título já cadastrado.");
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await request(app)
        .patch(`/missions/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin))
        .send({ xp_reward: 10 });

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem atualiza é um aluno", async() => {
      const res = await request(app)
        .patch(`/missions/${quiz._id}`)
        .set("Authorization", await como(alunoA))
        .send({ xp_reward: 999 });

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /missions/:id", () => {
    it("deve excluir a missão e tirar a referência da turma", async() => {
      await Class.findByIdAndUpdate(turmaA._id, { $addToSet: { missions: quiz._id } });

      const res = await request(app)
        .delete(`/missions/${quiz._id}`)
        .set("Authorization", await como(profA));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Missão excluída com sucesso.");
      expect(res.body.data).toBeNull();
      expect(await Mission.findById(quiz._id)).toBeNull();

      const turma = await Class.findById(turmaA._id);
      expect(turma.missions.map(String)).not.toContain(String(quiz._id));
    });

    it("deve retornar 403 quando a professora não criou a missão", async() => {
      const res = await request(app)
        .delete(`/missions/${quiz._id}`)
        .set("Authorization", await como(profB));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Você só pode excluir missões que criou.");
      expect(await Mission.findById(quiz._id)).not.toBeNull();
    });

    it("deve permitir que o admin exclua missão de qualquer professora", async() => {
      const res = await request(app)
        .delete(`/missions/${quiz._id}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(200);
    });

    it("deve retornar 404 quando a missão não existir", async() => {
      const res = await request(app)
        .delete(`/missions/${ID_INEXISTENTE}`)
        .set("Authorization", await como(admin));

      expect(res.status).toBe(404);
    });

    it("deve retornar 403 quando quem exclui é um aluno", async() => {
      const res = await request(app)
        .delete(`/missions/${quiz._id}`)
        .set("Authorization", await como(alunoA));

      expect(res.status).toBe(403);
    });

    it("deve retornar 498 quando não houver autenticação", async() => {
      const res = await request(app).delete(`/missions/${quiz._id}`);

      expect(res.status).toBe(498);
    });
  });
});
