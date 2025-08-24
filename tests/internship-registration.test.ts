import { describe, expect, it, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface InternshipRecord {
  intern: string;
  company: string;
  role: string;
  startDate: number;
  endDate: number;
  skills: string[];
  description: string;
  status: string;
  duration: number;
  companyName: string;
  location: string;
  contactInfo: string;
  achievements: string[];
  references: string[];
  registrationTimestamp: number;
}

interface ContractState {
  internships: Map<string, InternshipRecord>; // Key is hex string of buff 32
  internshipOwners: Map<string, string>; // principal
}

// Mock contract implementation
class InternshipRegistryMock {
  private state: ContractState = {
    internships: new Map(),
    internshipOwners: new Map(),
  };

  private ERR_ALREADY_REGISTERED = 100;
  private ERR_INVALID_HASH = 101;
  private ERR_INVALID_PRINCIPAL = 102;
  private ERR_INVALID_STRING_LENGTH = 103;
  private ERR_INVALID_DATE = 104;
  private ERR_INVALID_SKILLS_LIST = 105;
  private ERR_NOT_AUTHORIZED = 106;
  private ERR_INVALID_STATUS = 107;
  private ERR_INVALID_DURATION = 108;
  private ERR_INVALID_DESCRIPTION = 109;
  private ERR_INVALID_ROLE = 110;
  private ERR_INVALID_COMPANY_NAME = 111;
  private ERR_INVALID_LOCATION = 112;
  private ERR_INVALID_CONTACT_INFO = 113;
  private ERR_INVALID_ACHIEVEMENTS_LIST = 114;
  private ERR_INVALID_REFERENCES_LIST = 115;

  private MAX_LIST_LENGTH = 20;
  private MIN_DURATION = 1;

  // Simulate block height
  private currentBlockHeight = 1000;

  private sha256(input: string): string {
    // Mock hash function - in real, use crypto library, but for test, simple hash
    return Array.from(new TextEncoder().encode(input))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 64); // Simulate 32-byte hex
  }

  private validateString(str: string, maxLen: number): ClarityResponse<boolean> {
    return str.length > maxLen ? { ok: false, value: this.ERR_INVALID_STRING_LENGTH } : { ok: true, value: true };
  }

  private validateListLength(lst: any[], maxLen: number): ClarityResponse<boolean> {
    return lst.length > maxLen ? { ok: false, value: this.ERR_INVALID_SKILLS_LIST } : { ok: true, value: true };
  }

  private validatePrincipal(p: string): ClarityResponse<boolean> {
    return p === 'invalid' ? { ok: false, value: this.ERR_INVALID_PRINCIPAL } : { ok: true, value: true };
  }

  private validateDates(start: number, end: number): ClarityResponse<boolean> {
    return (start >= end || start === 0 || end === 0) ? { ok: false, value: this.ERR_INVALID_DATE } : { ok: true, value: true };
  }

  private validateDuration(dur: number): ClarityResponse<boolean> {
    return dur < this.MIN_DURATION ? { ok: false, value: this.ERR_INVALID_DURATION } : { ok: true, value: true };
  }

  private validateStatus(stat: string): ClarityResponse<boolean> {
    return (stat === '' || stat.length > 20) ? { ok: false, value: this.ERR_INVALID_STATUS } : { ok: true, value: true };
  }

  private concatDetails(intern: string, company: string, role: string, start: number, end: number): string {
    return `${intern}|${company}|${role}|${start}|${end}`;
  }

  registerInternship(
    caller: string,
    company: string,
    role: string,
    startDate: number,
    endDate: number,
    skills: string[],
    description: string,
    status: string,
    companyName: string,
    location: string,
    contactInfo: string,
    achievements: string[],
    references: string[]
  ): ClarityResponse<string> {
    const intern = caller;
    const details = this.concatDetails(intern, company, role, startDate, endDate);
    const internshipHash = this.sha256(details);
    const existing = this.state.internships.get(internshipHash);
    const duration = endDate - startDate;

    let valRes = this.validatePrincipal(intern);
    if (!valRes.ok) return valRes;
    valRes = this.validatePrincipal(company);
    if (!valRes.ok) return valRes;
    valRes = this.validateString(role, 100);
    if (!valRes.ok) return valRes;
    valRes = this.validateDates(startDate, endDate);
    if (!valRes.ok) return valRes;
    valRes = this.validateListLength(skills, this.MAX_LIST_LENGTH);
    if (!valRes.ok) return valRes;
    valRes = this.validateString(description, 500);
    if (!valRes.ok) return valRes;
    valRes = this.validateStatus(status);
    if (!valRes.ok) return valRes;
    valRes = this.validateDuration(duration);
    if (!valRes.ok) return valRes;
    valRes = this.validateString(companyName, 100);
    if (!valRes.ok) return valRes;
    valRes = this.validateString(location, 100);
    if (!valRes.ok) return valRes;
    valRes = this.validateString(contactInfo, 200);
    if (!valRes.ok) return valRes;
    valRes = this.validateListLength(achievements, 10);
    if (!valRes.ok) return valRes;
    for (const ach of achievements) {
      valRes = this.validateString(ach, 200);
      if (!valRes.ok) return valRes;
    }
    valRes = this.validateListLength(references, 5);
    if (!valRes.ok) return valRes;
    for (const ref of references) {
      valRes = this.validatePrincipal(ref);
      if (!valRes.ok) return valRes;
    }

    if (existing) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }

    this.state.internships.set(internshipHash, {
      intern,
      company,
      role,
      startDate,
      endDate,
      skills,
      description,
      status,
      duration,
      companyName,
      location,
      contactInfo,
      achievements,
      references,
      registrationTimestamp: this.currentBlockHeight,
    });

    this.state.internshipOwners.set(internshipHash, intern);

    return { ok: true, value: internshipHash };
  }

  getInternshipDetails(internshipHash: string): ClarityResponse<InternshipRecord | null> {
    return { ok: true, value: this.state.internships.get(internshipHash) ?? null };
  }

  getInternshipOwner(internshipHash: string): ClarityResponse<{ owner: string } | null> {
    const owner = this.state.internshipOwners.get(internshipHash);
    return { ok: true, value: owner ? { owner } : null };
  }

  isRegistered(internshipHash: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.internships.has(internshipHash) };
  }

  getRegistrationTimestamp(internshipHash: string): ClarityResponse<number> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.registrationTimestamp };
  }

  getInternshipSkills(internshipHash: string): ClarityResponse<string[]> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.skills };
  }

  getInternshipStatus(internshipHash: string): ClarityResponse<string> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.status };
  }

  getInternshipDuration(internshipHash: string): ClarityResponse<number> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.duration };
  }

  getInternshipAchievements(internshipHash: string): ClarityResponse<string[]> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.achievements };
  }

  getInternshipReferences(internshipHash: string): ClarityResponse<string[]> {
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    return { ok: true, value: entry.references };
  }

  updateStatus(caller: string, internshipHash: string, newStatus: string): ClarityResponse<boolean> {
    const owner = this.state.internshipOwners.get(internshipHash);
    if (!owner || caller !== owner) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    const valRes = this.validateStatus(newStatus);
    if (!valRes.ok) return valRes;
    entry.status = newStatus;
    this.state.internships.set(internshipHash, entry);
    return { ok: true, value: true };
  }

  addSkill(caller: string, internshipHash: string, newSkill: string): ClarityResponse<boolean> {
    const owner = this.state.internshipOwners.get(internshipHash);
    if (!owner || caller !== owner) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    if (entry.skills.length >= this.MAX_LIST_LENGTH) return { ok: false, value: this.ERR_INVALID_SKILLS_LIST };
    const valRes = this.validateString(newSkill, 50);
    if (!valRes.ok) return valRes;
    entry.skills.push(newSkill);
    this.state.internships.set(internshipHash, entry);
    return { ok: true, value: true };
  }

  addAchievement(caller: string, internshipHash: string, newAchievement: string): ClarityResponse<boolean> {
    const owner = this.state.internshipOwners.get(internshipHash);
    if (!owner || caller !== owner) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    if (entry.achievements.length >= 10) return { ok: false, value: this.ERR_INVALID_ACHIEVEMENTS_LIST };
    const valRes = this.validateString(newAchievement, 200);
    if (!valRes.ok) return valRes;
    entry.achievements.push(newAchievement);
    this.state.internships.set(internshipHash, entry);
    return { ok: true, value: true };
  }

  addReference(caller: string, internshipHash: string, newReference: string): ClarityResponse<boolean> {
    const owner = this.state.internshipOwners.get(internshipHash);
    if (!owner || caller !== owner) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    const entry = this.state.internships.get(internshipHash);
    if (!entry) return { ok: false, value: this.ERR_NOT_AUTHORIZED };
    if (entry.references.length >= 5) return { ok: false, value: this.ERR_INVALID_REFERENCES_LIST };
    const valRes = this.validatePrincipal(newReference);
    if (!valRes.ok) return valRes;
    entry.references.push(newReference);
    this.state.internships.set(internshipHash, entry);
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  intern: "ST1PQHQKV0RJXZHJ1DI0J8SJX3N7GSZI1BV4CE0Q5",
  company: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
  other: "ST3J2GVMMM2R2Z9SKN1VLHVAR6A4MJ1PJACRSNNRG",
};

describe("InternshipRegistry Contract", () => {
  let contract: InternshipRegistryMock;

  beforeEach(() => {
    contract = new InternshipRegistryMock();
  });

  it("should register a new internship successfully", () => {
    const result = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Software Engineer",
      1000,
      2000,
      ["JavaScript", "TypeScript"],
      "Developed web applications",
      "pending",
      "Tech Corp",
      "Remote",
      "contact@techcorp.com",
      ["Built API"],
      [accounts.other]
    );
    expect(result.ok).toBe(true);
    const hash = result.value as string;
    expect(hash).toHaveLength(64);

    const details = contract.getInternshipDetails(hash);
    expect(details.ok).toBe(true);
    expect(details.value).toMatchObject({
      role: "Software Engineer",
      startDate: 1000,
      endDate: 2000,
      skills: ["JavaScript", "TypeScript"],
      description: "Developed web applications",
      status: "pending",
      duration: 1000,
      companyName: "Tech Corp",
      location: "Remote",
      contactInfo: "contact@techcorp.com",
      achievements: ["Built API"],
      references: [accounts.other],
    });
  });

  it("should prevent duplicate registration", () => {
    contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Software Engineer",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );

    const duplicateResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Software Engineer",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    expect(duplicateResult.ok).toBe(false);
    expect(duplicateResult.value).toBe(100);
  });

  it("should validate invalid dates", () => {
    const result = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      2000,
      1000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(104);
  });

  it("should validate string lengths", () => {
    const longRole = "a".repeat(101);
    const result = contract.registerInternship(
      accounts.intern,
      accounts.company,
      longRole,
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(103);
  });

  it("should allow owner to update status", () => {
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    const hash = regResult.value as string;

    const updateResult = contract.updateStatus(accounts.intern, hash, "approved");
    expect(updateResult.ok).toBe(true);

    const status = contract.getInternshipStatus(hash);
    expect(status.ok).toBe(true);
    expect(status.value).toBe("approved");
  });

  it("should prevent non-owner from updating status", () => {
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    const hash = regResult.value as string;

    const updateResult = contract.updateStatus(accounts.other, hash, "approved");
    expect(updateResult.ok).toBe(false);
    expect(updateResult.value).toBe(106);
  });

  it("should allow adding skill", () => {
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      ["Skill1"],
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    const hash = regResult.value as string;

    const addResult = contract.addSkill(accounts.intern, hash, "NewSkill");
    expect(addResult.ok).toBe(true);

    const skills = contract.getInternshipSkills(hash);
    expect(skills.ok).toBe(true);
    expect(skills.value).toEqual(["Skill1", "NewSkill"]);
  });

  it("should prevent adding skill beyond max length", () => {
    const maxSkills = Array(20).fill("Skill");
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      maxSkills,
      "",
      "pending",
      "",
      "",
      "",
      [],
      []
    );
    const hash = regResult.value as string;

    const addResult = contract.addSkill(accounts.intern, hash, "ExtraSkill");
    expect(addResult.ok).toBe(false);
    expect(addResult.value).toBe(105);
  });

  it("should allow adding achievement", () => {
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      ["Ach1"],
      []
    );
    const hash = regResult.value as string;

    const addResult = contract.addAchievement(accounts.intern, hash, "NewAch");
    expect(addResult.ok).toBe(true);

    const achs = contract.getInternshipAchievements(hash);
    expect(achs.ok).toBe(true);
    expect(achs.value).toEqual(["Ach1", "NewAch"]);
  });

  it("should allow adding reference", () => {
    const regResult = contract.registerInternship(
      accounts.intern,
      accounts.company,
      "Role",
      1000,
      2000,
      [],
      "",
      "pending",
      "",
      "",
      "",
      [],
      [accounts.other]
    );
    const hash = regResult.value as string;

    const addResult = contract.addReference(accounts.intern, hash, "STNEWREF");
    expect(addResult.ok).toBe(true);

    const refs = contract.getInternshipReferences(hash);
    expect(refs.ok).toBe(true);
    expect(refs.value).toEqual([accounts.other, "STNEWREF"]);
  });
});