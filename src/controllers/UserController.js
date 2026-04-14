import UserService from "../service/UserService.js";
import { UsuarioSchema, UsuarioUpdateSchema } from '../utils/validators/schemas/zod/UsuarioSchema.js';
import { UsuarioQuerySchema, UsuarioIdSchema } from '../utils/validators/schemas/zod/querys/UsuarioQuerySchema.js';
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
    
    async listar(req, res){
        console.log('Estou no listar em UserController');

        const id = req?.params?.id;
        if(id) {
            UsuarioIdSchema.parse(id);
        }

        //Validação das queries (se existirem)
        const query = req?.query;
        if (Object.keys(query).length !== 0) {
            // deve apenas validar o objeto query, tendo erro o zod será responsável por lançar o erro
            await UsuarioQuerySchema.parseAsync(query);
        }

        const data = await this.service.listar(req);
        return CommonResponse.success(res, data);
    }

    async criar(req, res) {
        console.log('Estou no criar em UserController');

        // valida os dados - criar ajustes na biblioteca zod
        const parsedData = UsuarioSchema.parse(req.body);
        let data = await this.service.criar(parsedData, req);

        let usuarioLimpo = data.toObject();

        delete usuarioLimpo.senha;

        return CommonResponse.created(res, usuarioLimpo);
    }

    /**
     * Cria um novo usuário.
     */
    async criarComSenha(req, res) {
        console.log('Estou no criar em UserController');

        // valida os dados
        const parsedData = UsuarioSchema.parse(req.body);
        
        if (!req.user_id) {
            parsedData.nivel_acesso = {
                municipe: true,
                operador: false,
                secretario: false,
                administrador: false
            };
        }

        let data = await this.service.criarComSenha(parsedData);

        // Converte o documento Mongoose para um objeto simples
        let usuarioLimpo = data.toObject();

        delete usuarioLimpo.senha;

        return CommonResponse.created(res, usuarioLimpo);
    }

    async atualizar(req, res) {
        console.log('Estou no atualizar em UserController');

        const id = req?.params?.id;
        UsuarioIdSchema.parse(id);

        const parsedData = UsuarioUpdateSchema.parse(req.body);

        const data = await this.service.atualizar(id, parsedData, req);

        let usuarioLimpo = data.toObject();

        delete usuarioLimpo.email;
        delete usuarioLimpo.senha;

        return CommonResponse.success(res, usuarioLimpo, 200, 'Usuário atualizado com sucesso.');
    }

    async deletar(req, res) {
        console.log('Estou no atualizar em UserController');

        const id = req?.params?.id;
        UsuarioIdSchema.parse(id);

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