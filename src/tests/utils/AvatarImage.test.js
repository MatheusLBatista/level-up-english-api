import sharp from "sharp";
import { toAvatarWebp, AVATAR_SIZE, AVATAR_MAX_PIXELS } from "../../utils/AvatarImage.js";
import { CustomError } from "../../utils/helpers/index.js";

describe("AvatarImage", () => {
  const gerarImagem = (width, height) =>
    sharp({ create: { width, height, channels: 3, background: "#3366ff" } });

  const capturarErro = async(promise) => {
    try {
      await promise;
    } catch (erro) {
      return erro;
    }
    throw new Error("Era esperado um erro.");
  };

  describe("toAvatarWebp", () => {
    it("deve converter para WebP quadrado no tamanho do avatar", async() => {
      const png = await gerarImagem(800, 400).png().toBuffer();

      const saida = await toAvatarWebp(png);

      const meta = await sharp(saida).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(AVATAR_SIZE);
      expect(meta.height).toBe(AVATAR_SIZE);
    });

    it("deve aceitar JPEG", async() => {
      const jpeg = await gerarImagem(300, 200).jpeg().toBuffer();

      const meta = await sharp(await toAvatarWebp(jpeg)).metadata();

      expect(meta.format).toBe("webp");
    });

    it("deve descartar os metadados EXIF da foto original", async() => {
      const jpeg = await gerarImagem(300, 200).jpeg().withExif({ IFD0: { Copyright: "segredo" } }).toBuffer();
      expect((await sharp(jpeg).metadata()).exif).toBeDefined();

      const meta = await sharp(await toAvatarWebp(jpeg)).metadata();

      expect(meta.exif).toBeUndefined();
    });

    it("deve recusar conteúdo que não é imagem, mesmo que rotulado como imagem", async() => {
      const erro = await capturarErro(toAvatarWebp(Buffer.from("png-falso")));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
      expect(erro.field).toBe("avatar");
    });

    it("deve recusar imagem pequena em bytes mas enorme em pixels", async() => {
      const lado = Math.ceil(Math.sqrt(AVATAR_MAX_PIXELS)) + 1;
      const bomba = await gerarImagem(lado, lado).png().toBuffer();
      expect(bomba.length).toBeLessThan(2 * 1024 * 1024);

      const erro = await capturarErro(toAvatarWebp(bomba));

      expect(erro).toBeInstanceOf(CustomError);
      expect(erro.statusCode).toBe(400);
    });
  });
});
