class AttitudeFilterBuild {
  constructor() {
    this.filters = {};
  }

  withName(name) {
    if (name) {
      this.filters.name = { $regex: name, $options: "i" };
    }
    return this;
  }

  withType(type) {
    if (type) {
      this.filters.type = type;
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

export default AttitudeFilterBuild;
