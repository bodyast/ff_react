import { describe, it, expect } from "vitest";
import { validateForm } from "../core/validation";
import type { FormStructure, FieldState } from "../types/form";

function makeSchema(): FormStructure {
  return {
    uuid: "u1",
    id: "f1",
    title: "Form",
    pages: [
      {
        id: "p1",
        title: "P1",
        sections: [
          {
            id: "s1",
            title: "S1",
            fields: [
              { id: "name", type: "text", label: "Name", settings: { required: true } },
              { id: "age",  type: "number", label: "Age", settings: { min: 0, max: 120 } },
              { id: "bio",  type: "textarea", label: "Bio", settings: { max: 10 } },
            ],
          },
        ],
      },
    ],
    dependencies: [],
  };
}

const noStates: Record<string, FieldState> = {};

describe("validateForm", () => {
  it("returns error for required empty field", () => {
    const errors = validateForm({ schema: makeSchema(), data: {}, fieldStates: noStates });
    expect(errors["name"]).toBeDefined();
  });

  it("no error when required field has value", () => {
    const errors = validateForm({ schema: makeSchema(), data: { name: "Alice" }, fieldStates: noStates });
    expect(errors["name"]).toBeUndefined();
  });

  it("skips hidden fields", () => {
    const errors = validateForm({
      schema: makeSchema(),
      data: {},
      fieldStates: { name: { hidden: true, disabled: false, readonly: false, required: false } },
    });
    expect(errors["name"]).toBeUndefined();
  });

  it("validates number min/max", () => {
    let errors = validateForm({ schema: makeSchema(), data: { name: "x", age: -1 }, fieldStates: noStates });
    expect(errors["age"]).toBeDefined();

    errors = validateForm({ schema: makeSchema(), data: { name: "x", age: 200 }, fieldStates: noStates });
    expect(errors["age"]).toBeDefined();

    errors = validateForm({ schema: makeSchema(), data: { name: "x", age: 25 }, fieldStates: noStates });
    expect(errors["age"]).toBeUndefined();
  });

  it("validates text max length", () => {
    const errors = validateForm({
      schema: makeSchema(),
      data: { name: "x", bio: "this is way too long" },
      fieldStates: noStates,
    });
    expect(errors["bio"]).toBeDefined();
  });

  it("validates non-numeric number input", () => {
    const errors = validateForm({
      schema: makeSchema(),
      data: { name: "x", age: "abc" },
      fieldStates: noStates,
    });
    expect(errors["age"]).toBeDefined();
  });

  it("state required overrides schema", () => {
    const errors = validateForm({
      schema: makeSchema(),
      data: { name: "x" }, // bio has no value
      fieldStates: { bio: { hidden: false, disabled: false, readonly: false, required: true } },
    });
    expect(errors["bio"]).toBeDefined();
  });
});
