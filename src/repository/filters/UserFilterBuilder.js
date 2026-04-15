import User from "../../models/User.js";

import UserRepository from "../UserRepository.js";

class UserFilterBuilder {
  constructor() {
    this.filtros = {};
    this.userRepository = new UserRepository();
    this.userModel = new User();
  }

  withName(name) {
    if (name) {
      this.filtros.name = { $regex: name, $options: "i" };
    }
    return this;
  }

  withEmail(email) {
    if (email) {
      this.filtros.email = { $regex: email, $options: "i" };
    }
    return this;
  }

  withActive(active) {
    if (active !== undefined) {
      const valor =
        active === true || active === "true" || active === 1 || active === "1";
      this.filtros.ativo = valor;
    }
    return this;
  }

  withRole(role) {
    if (role) {
      this.filtros.role = { $regex: role, $options: "i" };
    }
    return this;
  }

  escapeRegex(texto) {
    return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  build() {
    return this.filtros;
  }
}

export default UserFilterBuilder;
