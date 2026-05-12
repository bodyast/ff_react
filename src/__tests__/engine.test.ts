import { describe, it, expect, vi } from "vitest";
import { createFormEngine } from "../core/engine";
import type { FormStructure } from "../types/form";

function makeSchema(extra: Partial<FormStructure> = {}): FormStructure {
  return {
    uuid: "form-uuid",
    id: "form1",
    title: "Test",
    pages: [
      {
        id: "p1",
        title: "Page 1",
        sections: [
          {
            id: "s1",
            title: "Sec 1",
            fields: [
              { id: "name", type: "text", label: "Name" },
              { id: "age", type: "number", label: "Age" },
              { id: "required_field", type: "text", label: "Req", settings: { required: true } },
            ],
          },
        ],
      },
    ],
    dependencies: [],
    ...extra,
  };
}

describe("createFormEngine", () => {
  it("initializes with default values", () => {
    const engine = createFormEngine({
      schema: makeSchema(),
      initialData: { name: "Bob" },
    });
    expect(engine.getData().name).toBe("Bob");
  });

  it("applies schema defaultValue", () => {
    const schema = makeSchema();
    schema.pages[0].sections[0].fields[0] = {
      id: "name",
      type: "text",
      label: "Name",
      settings: { defaultValue: "Default Name" },
    };
    const engine = createFormEngine({ schema, initialData: {} });
    expect(engine.getData().name).toBe("Default Name");
  });

  it("initialData overrides schema default", () => {
    const schema = makeSchema();
    schema.pages[0].sections[0].fields[0] = {
      id: "name",
      type: "text",
      label: "Name",
      settings: { defaultValue: "Default" },
    };
    const engine = createFormEngine({ schema, initialData: { name: "Custom" } });
    expect(engine.getData().name).toBe("Custom");
  });

  it("changeField updates data", () => {
    const engine = createFormEngine({ schema: makeSchema() });
    engine.changeField("name", "Alice");
    expect(engine.getData().name).toBe("Alice");
  });

  it("subscribe fires on changeField", () => {
    const engine = createFormEngine({ schema: makeSchema() });
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.changeField("name", "Test");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops notifications", () => {
    const engine = createFormEngine({ schema: makeSchema() });
    const listener = vi.fn();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.changeField("name", "Test");
    expect(listener).not.toHaveBeenCalled();
  });

  it("getFieldState returns defaults", () => {
    const engine = createFormEngine({ schema: makeSchema() });
    const state = engine.getFieldState("name");
    expect(state.hidden).toBe(false);
    expect(state.disabled).toBe(false);
    expect(state.required).toBe(false);
  });

  it("getFieldState reflects schema required", () => {
    const engine = createFormEngine({ schema: makeSchema() });
    const state = engine.getFieldState("required_field");
    expect(state.required).toBe(true);
  });

  it("validate returns errors for required empty fields", () => {
    const engine = createFormEngine({ schema: makeSchema(), initialData: {} });
    const errors = engine.validate();
    expect(errors["required_field"]).toBeDefined();
    expect(errors["required_field"]).toHaveLength(1);
  });

  it("validate passes when required fields filled", () => {
    const engine = createFormEngine({ schema: makeSchema(), initialData: { required_field: "value" } });
    const errors = engine.validate();
    expect(errors["required_field"]).toBeUndefined();
  });

  it("reset restores initial data", () => {
    const engine = createFormEngine({ schema: makeSchema(), initialData: { name: "Original" } });
    engine.changeField("name", "Changed");
    expect(engine.getData().name).toBe("Changed");
    engine.reset();
    expect(engine.getData().name).toBe("Original");
  });

  it("buildPayload includes data", () => {
    const engine = createFormEngine({
      schema: makeSchema(),
      initialData: { name: "Test User" },
      submissionId: "sub-123",
      formVersionUuid: "ver-456",
    });
    const payload = engine.buildPayload({ isFinal: false });
    expect(payload.data).toBeDefined();
    expect(payload.data.name).toBe("Test User");
  });

  it("dependency hides field based on value", () => {
    const schema = makeSchema({
      dependencies: [
        {
          id: "dep1",
          sources: ["name"],
          conditions: [{ field: "name", operator: "eq", value: "hide" }],
          actions: [{ property: "hidden", value: true, target: "age" }],
        },
      ],
    });
    const engine = createFormEngine({ schema });
    engine.changeField("name", "hide");
    expect(engine.getFieldState("age").hidden).toBe(true);
    engine.changeField("name", "show");
    // After changing away from "hide", hidden should revert (dep no longer fires)
    expect(engine.getFieldState("age").hidden).toBe(false);
  });
});
