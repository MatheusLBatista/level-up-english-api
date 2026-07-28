class AttitudeLogFilterBuild {
  constructor() {
    this.filters = {};
  }

  withStudent(student) {
    if (student) {
      this.filters.student = student;
    }
    return this;
  }

  withTeacher(teacher) {
    if (teacher) {
      this.filters.teacher = teacher;
    }
    return this;
  }

  withAttitude(attitude) {
    if (attitude) {
      this.filters.attitude = attitude;
    }
    return this;
  }

  build() {
    return this.filters;
  }
}

export default AttitudeLogFilterBuild;
