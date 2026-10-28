import UserRepository from "../repository/UserRepository.js";
import ClassRepository from "../repository/ClassRepository.js";
import MissionRepository from "../repository/MissionRepository.js";
import { findAccessibleStudent } from "../utils/StudentAccessHelper.js";
import { summarizeByType } from "../utils/PerformanceHelper.js";

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

    const progress = student.mission_progress ?? [];
    const missions = progress.length > 0
      ? await this.missionRepository.findTypesByIds(progress.map((entry) => entry.mission_id))
      : [];
    const typeById = new Map(missions.map((mission) => [String(mission._id), mission.type]));

    return { student: summarizeByType(progress, typeById) };
  }
}

export default PerformanceService;
