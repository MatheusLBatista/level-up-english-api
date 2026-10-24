import fs from "node:fs/promises";
import path from "node:path";

class LocalDiskStorage {
  constructor(baseDir = process.env.UPLOAD_DIR || "uploads", publicPath = "/uploads") {
    this.baseDir = path.resolve(baseDir);
    this.publicPath = publicPath;
  }

  resolve(key) {
    const fullPath = path.resolve(this.baseDir, key);

    if (!fullPath.startsWith(this.baseDir + path.sep)) {
      throw new Error("Chave de arquivo inválida.");
    }

    return fullPath;
  }

  async save(key, buffer) {
    const fullPath = this.resolve(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return key;
  }

  async delete(key) {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  getUrl(key) {
    return `${this.publicPath}/${key}`;
  }

  keyFromUrl(url) {
    const prefix = `${this.publicPath}/`;
    return url?.startsWith(prefix) ? url.slice(prefix.length) : null;
  }
}

export default LocalDiskStorage;
