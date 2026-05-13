import User from "../../models/User.js";
import mongoose from "mongoose";

import UserRepository from "../UserRepository.js";

class UserFilterBuild {
  constructor() {
    this.filters = {};
    this.userRepository = new UserRepository();
    this.userModel = new User();
  }

  withName(name) {
    if (name) {
      this.filters.name = { $regex: name, $options: "i" };
    }
    return this;
  }

  withEmail(email) {
    if (email) {
      this.filters.email = { $regex: email, $options: "i" };
    }
    return this;
  }

  withActive(active) {
    if (active !== undefined) {
      const value =
        active === true || active === "true" || active === 1 || active === "1";
      this.filters.active = value;
    }
    return this;
  }

  escapeRegex(texto) {
    return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  build() {
    return this.filters;
  }
}

export default UserFilterBuild;
