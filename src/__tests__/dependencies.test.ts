import { describe, it, expect } from "vitest";
import { evaluateDependencies } from "../core/dependencies";
import type { FormStructure } from "../types/form";

function makeSchema(overrides: Partial<FormStructure> = {}): FormStructure {
  return {
    uuid: "test-uuid",
    id: "test-form",
    title: "Test Form",
    pages: [
      {
        id: "page1",
        title: "Page 1",
        sections: [
          {
            id: "section1",
            title: "Section 1",
            fields: [
              { id: "fieldA", type: "text", label: "Field A" },
              { id: "fieldB", type: "text", label: "Field B" },
              { id: "fieldC", type: "text", label: "Field C" },
            ],
          },
        ],
      },
    ],
    dependencies: [],
    ...overrides,
  };
}

describe("evaluateDependencies", () => {
  it("returns empty object when no dependencies", () => {
    const schema = makeSchema();
    const result = evaluateDependencies({ schema, data: { fieldA: "x" } });
    expect(result).toEqual({});
  });

  it("applies hidden action when legacy condition met", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          trigger: "fieldA",
          conditions: [{ field: "fieldA", operator: "eq", value: "hide" }],
          actions: [{ property: "hidden", value: true, target: "fieldB" }],
        },
      ],
    });
    const result = evaluateDependencies({ schema, data: { fieldA: "hide" } });
    expect(result["fieldB"]?.hidden).toBe(true);
  });

  it("does not apply action when condition not met", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          trigger: "fieldA",
          conditions: [{ field: "fieldA", operator: "eq", value: "hide" }],
          actions: [{ property: "hidden", value: true, target: "fieldB" }],
        },
      ],
    });
    const result = evaluateDependencies({ schema, data: { fieldA: "show" } });
    expect(result["fieldB"]).toBeUndefined();
  });

  it("filters by changedFieldId", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          trigger: "fieldA",
          conditions: [],
          actions: [{ property: "hidden", value: true, target: "fieldB" }],
        },
        {
          id: "dep2",
          trigger: "fieldC",
          conditions: [],
          actions: [{ property: "disabled", value: true, target: "fieldB" }],
        },
      ],
    });
    // Only fieldA changed — only dep1 should fire
    const result = evaluateDependencies({ schema, data: {}, changedFieldId: "fieldA" });
    expect(result["fieldB"]?.hidden).toBe(true);
    expect(result["fieldB"]?.disabled).toBeUndefined();
  });

  it("applies JSON Logic condition", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA"],
          conditions: [
            { type: "logic", value: { ">": [{ var: "fieldA" }, 5] } },
          ],
          actions: [{ property: "required", value: true, target: "fieldB" }],
        },
      ],
    });
    expect(
      evaluateDependencies({ schema, data: { fieldA: 10 } })["fieldB"]?.required
    ).toBe(true);
    expect(
      evaluateDependencies({ schema, data: { fieldA: 3 } })["fieldB"]
    ).toBeUndefined();
  });

  it("supports legacy operator conditions: neq, gt, lt", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA"],
          conditions: [{ field: "fieldA", operator: "neq", value: "x" }],
          actions: [{ property: "disabled", value: true, target: "fieldC" }],
        },
      ],
    });
    expect(evaluateDependencies({ schema, data: { fieldA: "y" } })["fieldC"]?.disabled).toBe(true);
    expect(evaluateDependencies({ schema, data: { fieldA: "x" } })["fieldC"]).toBeUndefined();
  });

  it("supports sources array trigger", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA", "fieldB"],
          conditions: [],
          actions: [{ property: "hidden", value: true, target: "fieldC" }],
        },
      ],
    });
    // Triggered by fieldB
    const result = evaluateDependencies({ schema, data: {}, changedFieldId: "fieldB" });
    expect(result["fieldC"]?.hidden).toBe(true);
  });

  it("evaluates all deps when changedFieldId is undefined", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA"],
          conditions: [{ field: "fieldA", operator: "eq", value: "yes" }],
          actions: [{ property: "hidden", value: true, target: "fieldB" }],
        },
      ],
    });
    const result = evaluateDependencies({ schema, data: { fieldA: "yes" } });
    expect(result["fieldB"]?.hidden).toBe(true);
  });

  it("merges with currentStates", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA"],
          conditions: [{ field: "fieldA", operator: "eq", value: "go" }],
          actions: [{ property: "required", value: true, target: "fieldC" }],
        },
      ],
    });
    const current = { fieldB: { hidden: true } };
    const result = evaluateDependencies({
      schema,
      data: { fieldA: "go" },
      currentStates: current,
    });
    expect(result["fieldB"]?.hidden).toBe(true);
    expect(result["fieldC"]?.required).toBe(true);
  });

  it("conditionOperator or — fires if any condition true", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["fieldA"],
          conditionOperator: "or",
          conditions: [
            { field: "fieldA", operator: "eq", value: "x" },
            { field: "fieldA", operator: "eq", value: "y" },
          ],
          actions: [{ property: "hidden", value: true, target: "fieldB" }],
        },
      ],
    });
    expect(evaluateDependencies({ schema, data: { fieldA: "x" } })["fieldB"]?.hidden).toBe(true);
    expect(evaluateDependencies({ schema, data: { fieldA: "y" } })["fieldB"]?.hidden).toBe(true);
    expect(evaluateDependencies({ schema, data: { fieldA: "z" } })["fieldB"]).toBeUndefined();
  });
});
