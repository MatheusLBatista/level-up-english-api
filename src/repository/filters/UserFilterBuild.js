import { escapeRegex } from "../../utils/helpers/index.js";

class UserFilterBuild {
  constructor() {
    this.filters = {};
  }

  withName(name) {
    if (name) {
      this.filters.name = { $regex: escapeRegex(name), $options: "i" };
    }
    return this;
  }

  withEmail(email) {
    if (email) {
      this.filters.email = { $regex: escapeRegex(email), $options: "i" };
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
    if (classId === "none") {
      // null no Mongo casa tanto class: null quanto o campo ausente.
      this.filters.class = null;
    } else if (classId) {
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

  withGuardianConsent(status) {
    const filters = {
      pending: { guardian_consent_at: null, guardian_consent_revoked_at: null },
      recorded: { guardian_consent_at: { $ne: null }, guardian_consent_revoked_at: null },
      revoked: { guardian_consent_revoked_at: { $ne: null } },
    };

    if (Object.hasOwn(filters, status)) {
      Object.assign(this.filters, { role: "student" }, filters[status]);
    }
    return this;
  }

  build() {
    return this.filters;
  }
}

export default UserFilterBuild;
