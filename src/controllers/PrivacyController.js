import PrivacyService from "../service/PrivacyService.js";
import { CommonResponse } from "../utils/helpers/index.js";
import { ErasureBodySchema } from "../schemas/PrivacySchema.js";

class PrivacyController {
  constructor() {
    this.service = new PrivacyService();
  }

  async erase(req, res) {
    ErasureBodySchema.parse(req.body ?? {});
    const data = await this.service.eraseStudent(req.params.id, req);

    const clean = data.toObject();
    delete clean.password;

    return CommonResponse.success(res, clean, 200, "Dados do aluno eliminados.");
  }

  async exportData(req, res) {
    const data = await this.service.exportStudentData(req.params.id, req);

    res.set("Content-Disposition", `attachment; filename="dados-aluno-${data.student._id}.json"`);
    return CommonResponse.success(res, data, 200, "Dados do aluno exportados.");
  }
}

export default PrivacyController;
