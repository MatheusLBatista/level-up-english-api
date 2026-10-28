import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import MissionRepository from "../repository/MissionRepository.js";
import { findAccessibleStudent } from "../utils/StudentAccessHelper.js";
import { averageByType, summarizeByType } from "../utils/PerformanceHelper.js";

class PerformanceService {
  constructor({
    userRepository = new UserRepository(),
    classRepository = new ClassRepository(),
    missionRepository = new MissionRepository(),
  } = {}) {
    this.userRepository = userRepository;
    this.classRepository = classRepository;
    this.missionRepository = missionRepository;
  }

  async getByStudent(studentId, req) {
    const loggedUser = await this.userRepository.findById(req.user_id);
    const student = await findAccessibleStudent(this, studentId, loggedUser, {
      ownOnly: "Você só pode ver o seu desempenho.",
      teacherOnly: "Você só pode ver o desempenho de alunos das suas turmas.",
    });

    const classmates = student.class
      ? await this.userRepository.findActiveStudentsProgressByClass(student.class)
      : [];
    const typeById = await this.loadMissionTypes([student, ...classmates]);
    const summarize = (user) => summarizeByType(user.mission_progress ?? [], typeById);

    return {
      student: summarize(student),
      class: student.class ? averageByType(classmates.map(summarize)) : null,
    };
  }

  async loadMissionTypes(users) {
    const ids = new Set(users.flatMap((user) => (user.mission_progress ?? []).map((entry) => String(entry.mission_id))));
    if (ids.size === 0) return new Map();

    const missions = await this.missionRepository.findTypesByIds([...ids]);
    return new Map(missions.map((mission) => [String(mission._id), mission.type]));
  }
}

export default PerformanceService;
