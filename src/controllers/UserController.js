import UserService from '../service/UserService.js';
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

    async list(req, res) {
        const data = await this.service.list(req);
        return CommonResponse.success(res, data);
    }

    async criar(req, res) {
        console.log('Estou no criar em UserController');

        const parsedData = req.body;
        let data = await this.service.criar(parsedData, req);

        let usuarioLimpo = data.toObject();
        delete usuarioLimpo.password;

        return CommonResponse.created(res, usuarioLimpo);
    }

    async criarComSenha(req, res) {
        console.log('Estou no criarComSenha em UserController');

        const parsedData = req.body;
        let data = await this.service.criarComSenha(parsedData);

        let usuarioLimpo = data.toObject();
        delete usuarioLimpo.password;

        return CommonResponse.created(res, usuarioLimpo);
    }

    async atualizar(req, res) {
        console.log('Estou no atualizar em UserController');

        const id = req?.params?.id;
        if (!id) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'id',
                details: [],
                customMessage: 'ID do usuário é obrigatório.'
            });
        }

        const parsedData = req.body;
        const data = await this.service.atualizar(id, parsedData, req);

        let usuarioLimpo = data.toObject();
        delete usuarioLimpo.email;
        delete usuarioLimpo.password;

        return CommonResponse.success(res, usuarioLimpo, 200, 'Usuário atualizado com sucesso.');
    }

    async deletar(req, res) {
        console.log('Estou no deletar em UserController');

        const id = req?.params?.id;
        if (!id) {
            throw new CustomError({
                statusCode: HttpStatusCodes.BAD_REQUEST.code,
                errorType: 'validationError',
                field: 'id',
                details: [],
                customMessage: 'ID do usuário é obrigatório para deletar.'
            });
        }

        const data = await this.service.deletar(id, req);
        return CommonResponse.success(res, data, 200, 'Usuário excluído com sucesso.');
    }
}

export default UserController;