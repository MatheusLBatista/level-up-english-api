class MissionFilterBuild {
  constructor() {
    this.filters = {};
  }

  withTitle(title) {
    if (title) {
      this.filters.title = { $regex: title, $options: "i" };
    }
    return this;
  }

  withType(type) {
    if (type) {
      this.filters.type = type;
    }
    return this;
  }

  withClassId(class_id) {
    if (class_id) {
      this.filters.class_id = class_id;
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

export default MissionFilterBuild;
