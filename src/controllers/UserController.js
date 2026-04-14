import UserService from "../service/UserService.js";
import objectIdSchema from "../utils/schemas/objectIdSchema.js";
import {
    CommonResponse,
    CustomError,
    HttpStatusCodes,
    errorHandler,
    messages,
    StatusService,
    asyncWrapper
} from '../utils/helpers/index.js';
import TokenUtil from '../utils/TokenUtil.js';

class UserController {
    constructor() {
        this.service = new UserService();
        this.TokenUtil = TokenUtil;
    }
    
    async list(req, res){

        const id = req?.params?.id;
        if(id) {
            objectIdSchema.parse(id);
        }

        // const query = req?.query;
        // if (Object.keys(query).length !== 0) {
        //     await UsuarioQuerySchema.parseAsync(query);
        // }

        const data = await this.service.listar(req);
        return CommonResponse.success(res, data);
    }
}

export default UserController;