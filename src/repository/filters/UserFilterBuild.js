class UserFilterBuild {
  constructor() {
    this.filters = {};
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

  withRole(role) {
    if (role) {
      this.filters.role = role;
    }
    return this;
  }

  withClass(classId) {
    if (classId) {
      this.filters.class = classId;
    }
    return this;
  }

  withActive(active) {
    if (active !== undefined) {
      this.filters.active =
        active === true || active === "true" || active === 1 || active === "1";
    }
    return this;
  }

  build() {
    return this.filters;
  }
}

export default UserFilterBuild;
