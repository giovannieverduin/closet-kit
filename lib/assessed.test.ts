import { describe, it, expect } from "vitest";
import { toDbVerdict, assessedTitle } from "./assessed";

describe("toDbVerdict", () => {
  it("maps the four assess verdicts onto the three DB options", () => {
    expect(toDbVerdict("Strong yes")).toBe("Strong yes");
    expect(toDbVerdict("Worth it")).toBe("Strong yes");
    expect(toDbVerdict("Only if")).toBe("Only if");
    expect(toDbVerdict("Skip")).toBe("Avoid");
  });
  it("passes through DB-native 'Avoid' and defaults unknowns to 'Only if'", () => {
    expect(toDbVerdict("Avoid")).toBe("Avoid");
    expect(toDbVerdict(undefined)).toBe("Only if");
    expect(toDbVerdict("whatever")).toBe("Only if");
  });
});

describe("assessedTitle", () => {
  it("prefers the name, then occasion, then a default", () => {
    expect(assessedTitle({ name: "Aje silk midi" })).toBe("Aje silk midi");
    expect(assessedTitle({ name: "", occasion: "Wedding" })).toBe("Wedding");
    expect(assessedTitle({})).toBe("Assessed look");
  });
});
