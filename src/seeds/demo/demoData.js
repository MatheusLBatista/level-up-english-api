export const DEFAULT_PASSWORD = "Senha@123";
export const EMAIL_DOMAIN = "levelup.edu.br";

export const SEMESTER_START = "2026-08-03";
export const NOW = "2026-10-16T09:00:00-03:00";

export const admin = { name: "Renata Albuquerque", email: `renata.albuquerque@${EMAIL_DOMAIN}` };

export const otherAdmins = [
  { name: "Matheus Batista", email: "matheusifro2020@gmail.com" },
];

export const teachers = [
  { key: "carla", name: "Carla Mendes", email: `carla.mendes@${EMAIL_DOMAIN}` },
  { key: "juliana", name: "Juliana Prado", email: `juliana.prado@${EMAIL_DOMAIN}` },
  { key: "matheus", name: "Matheus Lucas", email: "matheus20157813@gmail.com" },
];

export const profiles = {
  destaque: { completion: 1, accuracy: 0.95, retry: 0.9, delay: [0, 2], positives: 6, negatives: 0 },
  dedicado: { completion: 1, accuracy: 0.85, retry: 0.6, delay: [0, 3], positives: 4, negatives: 1 },
  regular: { completion: 0.85, accuracy: 0.7, retry: 0.3, delay: [1, 5], positives: 3, negatives: 1 },
  oscilante: { completion: 0.7, accuracy: 0.6, retry: 0.2, delay: [2, 6], positives: 2, negatives: 3 },
  desmotivado: { completion: 0.45, accuracy: 0.45, retry: 0, delay: [3, 8], positives: 1, negatives: 3 },
  transferido: { completion: 0.9, accuracy: 0.75, retry: 0.4, delay: [0, 3], positives: 1, negatives: 0 },
  recemChegado: { completion: 0, accuracy: 0, retry: 0, delay: [0, 0], positives: 0, negatives: 0 },
};

export const classes = [
  {
    key: "1A",
    name: "1º Ano A — Manhã",
    teacher: "carla",
    weekdays: [2, 4],
    period: "manha",
    students: [
      { name: "Ana Luiza Ferreira", profile: "destaque", olympiad: true },
      { name: "Pedro Henrique Costa", profile: "dedicado" },
      { name: "Maria Eduarda Lima", profile: "dedicado" },
      { name: "Gabriel Souza", profile: "regular", fallsLevel: true },
      { name: "Isabela Rodrigues", profile: "regular" },
      { name: "Lucas Almeida", profile: "oscilante" },
      { name: "Enzo Gabriel Martins", profile: "desmotivado" },
      { name: "Laura Pereira", profile: "transferido", joinedAt: "2026-09-21" },
    ],
  },
  {
    key: "2B",
    name: "2º Ano B — Manhã",
    teacher: "matheus",
    weekdays: [1, 3],
    period: "manha",
    students: [
      { name: "Beatriz Carvalho", profile: "destaque", olympiad: true, fair: true },
      { name: "João Victor Ribeiro", profile: "dedicado", fair: true },
      { name: "Sophia Gomes", profile: "dedicado" },
      { name: "Matheus Oliveira", profile: "regular", fair: true },
      { name: "Valentina Barbosa", profile: "regular" },
      { name: "Davi Lucas Rocha", profile: "oscilante" },
      { name: "Manuela Dias", profile: "desmotivado" },
      { name: "Arthur Nascimento", profile: "recemChegado", joinedAt: "2026-10-14" },
    ],
  },
  {
    key: "3A",
    name: "3º Ano A — Tarde",
    teacher: "juliana",
    weekdays: [3, 5],
    period: "tarde",
    students: [
      { name: "Heloísa Fernandes", profile: "destaque", olympiad: true },
      { name: "Rafael Moreira", profile: "destaque" },
      { name: "Giovanna Santos", profile: "dedicado" },
      { name: "Bernardo Araújo", profile: "regular" },
      { name: "Lívia Cardoso", profile: "regular" },
      { name: "Samuel Teixeira", profile: "oscilante" },
      { name: "Yasmin Correia", profile: "desmotivado" },
      { name: "Nicolas Pinto", profile: "regular", deactivatedAt: "2026-09-30" },
    ],
  },
];

export const attitudes = [
  { name: "Participação em aula", description: "Respondeu ou perguntou em inglês durante a explicação.", xp_value: 10, type: "positive" },
  { name: "Tarefa entregue no prazo", description: "Entregou a atividade de casa completa e no prazo.", xp_value: 15, type: "positive" },
  { name: "Ajudou um colega", description: "Explicou o conteúdo para um colega com dificuldade.", xp_value: 20, type: "positive" },
  { name: "Conversa toda em inglês", description: "Manteve a atividade em dupla inteira em inglês.", xp_value: 15, type: "positive" },
  { name: "Apresentação oral", description: "Apresentou um trabalho em inglês para a turma.", xp_value: 30, type: "positive" },
  { name: "Atraso", description: "Chegou depois do início da aula sem justificativa.", xp_value: 5, type: "negative" },
  { name: "Celular durante a aula", description: "Usou o celular fora das atividades propostas.", xp_value: 10, type: "negative" },
  { name: "Tarefa não entregue", description: "Não entregou a atividade de casa.", xp_value: 15, type: "negative" },
  { name: "Conversa paralela", description: "Atrapalhou a explicação com conversa fora do assunto.", xp_value: 5, type: "negative" },
  { name: "Desafio relâmpago", description: "Venceu o desafio de vocabulário do início da aula. Substituída pela missão de vocabulário.", xp_value: 25, type: "positive", active: false },
];

export const adjustments = {
  olympiad: { date: "2026-09-18T15:00:00-03:00", amount: 50, reason: "Olimpíada de inglês: classificado(a) para a 2ª fase" },
  fair: { date: "2026-09-26T11:30:00-03:00", amount: 30, reason: "Feira de idiomas: apresentação do grupo sobre o Reino Unido" },
  fallsLevel: { date: "2026-10-09T10:15:00-03:00", reason: "Atividade copiada de um colega: XP da missão estornado" },
};

const q = (question, a, b, c, d, correct_answer) => ({ question, options: { a, b, c, d }, correct_answer });

export const missions = {
  "1A": [
    {
      title: "Verb to be",
      description: "Revise as formas afirmativa, negativa e interrogativa do verbo to be.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("She ___ my best friend.", "am", "is", "are", "be", "b"),
        q("We ___ from Brazil.", "is", "am", "are", "be", "c"),
        q("___ you a student?", "Is", "Am", "Be", "Are", "d"),
        q("I ___ not tired today.", "am", "is", "are", "be", "a"),
        q("The books ___ on the table.", "is", "are", "am", "be", "b"),
      ],
    },
    {
      title: "Family members",
      description: "Aprenda os nomes dos membros da família em inglês.",
      type: "vocabulary",
      xp_reward: 100,
      content: "mother — mãe\nfather — pai\nsister — irmã\nbrother — irmão\ngrandmother — avó\ngrandfather — avô\naunt — tia\nuncle — tio\ncousin — primo(a)\nniece — sobrinha\nnephew — sobrinho",
      questions: [
        q("What is \"tia\" in English?", "niece", "aunt", "cousin", "sister", "b"),
        q("My father's father is my...", "uncle", "brother", "grandfather", "nephew", "c"),
        q("\"Cousin\" means...", "primo(a)", "sobrinho", "tio", "neto", "a"),
      ],
    },
    {
      title: "Simple present",
      description: "Rotinas e hábitos: o presente simples e o -s da terceira pessoa.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("He ___ soccer every Saturday.", "play", "plays", "playing", "is play", "b"),
        q("They ___ like spicy food.", "doesn't", "isn't", "don't", "aren't", "c"),
        q("___ she work at a hospital?", "Do", "Does", "Is", "Are", "b"),
        q("My mother ___ coffee in the morning.", "drinks", "drink", "drinking", "is drink", "a"),
        q("I ___ to school by bus.", "goes", "going", "gone", "go", "d"),
      ],
    },
    {
      title: "Daily routine",
      description: "Assista ao vídeo sobre a rotina de um estudante e responda às perguntas.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=E60-Ij9ODQg",
      questions: [
        q("Which word describes an action you do every day?", "routine", "holiday", "weekend", "birthday", "a"),
        q("\"I wake up at 6 a.m.\" means...", "Eu durmo às 6h", "Eu acordo às 6h", "Eu almoço às 6h", "Eu saio às 6h", "b"),
      ],
    },
    {
      title: "Food and drinks",
      description: "Vocabulário de comidas e bebidas para pedir um lanche.",
      type: "vocabulary",
      xp_reward: 100,
      content: "bread — pão\ncheese — queijo\nbeans — feijão\nrice — arroz\nchicken — frango\njuice — suco\nwater — água\nstrawberry — morango\nbreakfast — café da manhã\nlunch — almoço\ndinner — jantar",
      questions: [
        q("What is \"feijão\" in English?", "rice", "beans", "bread", "cheese", "b"),
        q("The first meal of the day is...", "dinner", "lunch", "breakfast", "snack", "c"),
        q("\"Strawberry\" is a...", "fruta", "bebida", "verdura", "sobremesa gelada", "a"),
      ],
    },
    {
      title: "There is / There are",
      description: "Descreva lugares usando there is e there are.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("___ a bank near my house.", "There are", "There is", "They are", "It are", "b"),
        q("___ many students in the classroom.", "There is", "There are", "It is", "There be", "b"),
        q("Is there ___ milk in the fridge?", "a", "many", "any", "an", "c"),
        q("There aren't ___ chairs in the room.", "some", "any", "a", "an", "b"),
        q("___ an apple on the table.", "There is", "There are", "Are there", "They is", "a"),
      ],
    },
    {
      title: "At the restaurant",
      description: "Ouça um diálogo num restaurante e responda às perguntas de checagem.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=Y7c3c-4S-g4",
      questions: [
        q("\"Can I have the menu, please?\" is said by...", "the waiter", "the customer", "the cook", "the cashier", "b"),
        q("\"The bill\" means...", "o cardápio", "a gorjeta", "a conta", "a mesa", "c"),
        q("What do you say to order?", "I'd like a sandwich, please.", "I like sandwich yesterday.", "You are a sandwich.", "Sandwich is me.", "a"),
      ],
    },
  ],
  "2B": [
    {
      title: "Simple past",
      description: "Verbos regulares e irregulares no passado simples.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("Yesterday I ___ a great movie.", "watch", "watched", "watching", "watches", "b"),
        q("She ___ to Salvador last year.", "goed", "go", "went", "gone", "c"),
        q("We ___ go to school on Monday. It was a holiday.", "didn't", "don't", "weren't", "doesn't", "a"),
        q("___ you see the game last night?", "Do", "Were", "Was", "Did", "d"),
        q("The past of \"buy\" is...", "buyed", "bought", "brought", "buied", "b"),
      ],
    },
    {
      title: "Travel and transportation",
      description: "Vocabulário de viagem: aeroporto, transporte e hospedagem.",
      type: "vocabulary",
      xp_reward: 100,
      content: "luggage — bagagem\nboarding pass — cartão de embarque\nflight — voo\nsubway — metrô\ntrain station — estação de trem\nround trip — ida e volta\none-way ticket — passagem só de ida\nhostel — albergue\nsightseeing — passeio turístico\ncustoms — alfândega",
      questions: [
        q("\"Luggage\" means...", "passagem", "bagagem", "bilheteria", "alfândega", "b"),
        q("To go and come back is a...", "one-way ticket", "round trip", "flight delay", "boarding pass", "b"),
        q("\"Subway\" is a type of...", "transporte", "hotel", "documento", "comida", "a"),
      ],
    },
    {
      title: "Past continuous",
      description: "O que estava acontecendo: was/were + -ing.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("I ___ studying when you called.", "were", "was", "am", "did", "b"),
        q("They ___ playing video games at 9 p.m.", "was", "were", "is", "did", "b"),
        q("What ___ you doing yesterday at noon?", "was", "did", "were", "are", "c"),
        q("She was cooking ___ the lights went out.", "while", "when", "during", "for", "b"),
        q("It ___ raining, so we stayed home.", "was", "were", "is", "did", "a"),
      ],
    },
    {
      title: "A trip to London",
      description: "Assista a um vlog de viagem a Londres e responda às perguntas.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=oIwuv7tWTCM",
      questions: [
        q("Big Ben is a famous...", "clock tower", "bridge", "museum", "palace", "a"),
        q("The London Eye is a giant...", "clock tower", "observation wheel", "bridge", "palace", "b"),
      ],
    },
    {
      title: "Jobs and professions",
      description: "Profissões e o que cada uma faz.",
      type: "vocabulary",
      xp_reward: 100,
      content: "lawyer — advogado(a)\nnurse — enfermeiro(a)\nengineer — engenheiro(a)\nfirefighter — bombeiro(a)\nplumber — encanador(a)\ncashier — caixa\nsoftware developer — desenvolvedor(a) de software\nveterinarian — veterinário(a)\njournalist — jornalista\nchef — chef de cozinha",
      questions: [
        q("Who takes care of sick animals?", "nurse", "veterinarian", "lawyer", "plumber", "b"),
        q("\"Firefighter\" means...", "bombeiro(a)", "policial", "eletricista", "segurança", "a"),
        q("Who fixes pipes and leaks?", "cashier", "journalist", "plumber", "chef", "c"),
      ],
    },
    {
      title: "Comparatives and superlatives",
      description: "Comparando pessoas, lugares e coisas.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("Brazil is ___ than Portugal.", "big", "bigger", "biggest", "more big", "b"),
        q("This is the ___ book I have ever read.", "more interesting", "most interesting", "interestinger", "interesting", "b"),
        q("My sister is ___ than me.", "tall", "taller", "tallest", "more tall", "b"),
        q("Today is ___ than yesterday.", "worse", "badder", "worst", "more bad", "a"),
        q("Mount Everest is the ___ mountain in the world.", "higher", "high", "highest", "most high", "c"),
      ],
    },
    {
      title: "Job interview",
      description: "Ouça uma simulação de entrevista de emprego e responda às perguntas.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=JAh5gVQfjdE",
      questions: [
        q("\"Tell me about yourself\" asks about your...", "salary", "background", "address", "schedule", "b"),
        q("A \"strength\" is...", "um ponto forte", "um defeito", "um salário", "um horário", "a"),
        q("What is a polite way to finish the interview?", "Bye, whatever.", "Thank you for your time.", "I'm leaving now.", "Give me the job.", "b"),
      ],
    },
  ],
  "3A": [
    {
      title: "Present perfect",
      description: "Experiências e ações que começaram no passado e continuam até hoje.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("I ___ never been to Argentina.", "has", "have", "had", "am", "b"),
        q("She has lived here ___ 2019.", "for", "since", "ago", "during", "b"),
        q("___ you ever eaten sushi?", "Did", "Has", "Have", "Do", "c"),
        q("They have studied English ___ five years.", "since", "ago", "for", "in", "c"),
        q("He ___ just finished his homework.", "has", "have", "is", "did", "a"),
      ],
    },
    {
      title: "False friends",
      description: "Palavras parecidas com o português, mas com outro significado.",
      type: "vocabulary",
      xp_reward: 100,
      content: "pretend — fingir (não é \"pretender\")\nactually — na verdade (não é \"atualmente\")\npush — empurrar (não é \"puxar\")\nparents — pais (não é \"parentes\")\nlibrary — biblioteca (não é \"livraria\")\nexquisite — refinado (não é \"esquisito\")\nintend — pretender\nnowadays — atualmente\nrelatives — parentes\nbookstore — livraria",
      questions: [
        q("\"Actually\" means...", "atualmente", "na verdade", "realmente atual", "ultimamente", "b"),
        q("How do you say \"livraria\"?", "library", "bookstore", "bookshelf", "librarian", "b"),
        q("\"Parents\" means...", "parentes", "pais", "padrinhos", "primos", "b"),
      ],
    },
    {
      title: "Conditionals",
      description: "First e second conditional: possibilidades reais e hipotéticas.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("If it rains tomorrow, we ___ stay home.", "would", "will", "did", "are", "b"),
        q("If I ___ rich, I would travel the world.", "am", "will be", "were", "be", "c"),
        q("She would pass the test if she ___ more.", "studies", "studied", "will study", "study", "b"),
        q("If you heat ice, it ___.", "melts", "melted", "would melt", "melting", "a"),
        q("What ___ you do if you won the lottery?", "will", "do", "would", "did", "c"),
      ],
    },
    {
      title: "Technology and school",
      description: "Assista a uma palestra sobre tecnologia na educação e responda às perguntas.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=9IbN1LxXevM",
      questions: [
        q("\"Screen time\" refers to...", "tempo de tela", "hora do recreio", "tempo de prova", "aula online", "a"),
        q("A \"speaker\" in a talk is the person who...", "listens", "presents", "records", "translates", "b"),
      ],
    },
    {
      title: "Everyday phrasal verbs",
      description: "Phrasal verbs comuns em conversas e em textos do ENEM.",
      type: "vocabulary",
      xp_reward: 100,
      content: "give up — desistir\nlook for — procurar\nfind out — descobrir\nturn on / turn off — ligar / desligar\ngrow up — crescer\nrun out of — ficar sem\nput off — adiar\ncatch up — colocar em dia\nshow up — aparecer\nfigure out — entender, resolver",
      questions: [
        q("\"Give up\" means...", "desistir", "devolver", "levantar", "doar", "a"),
        q("\"We ran out of milk\" means...", "Corremos para comprar leite", "Ficamos sem leite", "Derramamos o leite", "Compramos leite", "b"),
        q("To postpone a meeting is to...", "put off", "show up", "find out", "grow up", "a"),
      ],
    },
    {
      title: "Reading comprehension: ENEM style",
      description: "Leia trechos curtos no estilo do ENEM e responda.",
      type: "quiz",
      xp_reward: 150,
      questions: [
        q("\"Despite the rain, the concert went on.\" The concert...", "was cancelled", "happened anyway", "started late", "was indoors", "b"),
        q("\"Recycling reduces waste.\" The text suggests recycling is...", "harmful", "expensive", "beneficial", "illegal", "c"),
        q("In a sign that says \"Keep off the grass\", you must...", "cut the grass", "not walk on the grass", "water the grass", "sit on the grass", "b"),
        q("\"However\" is used to introduce...", "a contrast", "an example", "a conclusion", "a cause", "a"),
        q("\"The museum is free on Sundays.\" On Sundays the museum...", "is closed", "costs more", "has no entrance fee", "opens late", "c"),
      ],
    },
    {
      title: "News report: climate change",
      description: "Ouça uma reportagem sobre mudanças climáticas e responda às perguntas.",
      type: "audio",
      xp_reward: 120,
      content_url: "https://www.youtube.com/watch?v=g6xKlnT_TG8",
      questions: [
        q("\"Global warming\" is...", "aquecimento global", "aviso global", "inverno global", "mercado global", "a"),
        q("\"Greenhouse gases\" are gases that...", "cool the planet", "trap heat", "clean the air", "make rain", "b"),
        q("A \"drought\" is a long period without...", "sun", "wind", "rain", "snow", "c"),
      ],
    },
  ],
};

export const missionReleaseDays = [1, 11, 22, 32, 43, 53, 65];
