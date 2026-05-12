import { describe, it, expect } from "vitest";
import { applyJsonLogic, isTruthy } from "../core/jsonLogic";

describe("applyJsonLogic", () => {
  it("returns primitives as-is", () => {
    expect(applyJsonLogic(42, {})).toBe(42);
    expect(applyJsonLogic("hello", {})).toBe("hello");
    expect(applyJsonLogic(true, {})).toBe(true);
    expect(applyJsonLogic(null, {})).toBe(null);
  });

  it("var — simple field access", () => {
    expect(applyJsonLogic({ var: "name" }, { name: "Alice" })).toBe("Alice");
    expect(applyJsonLogic({ var: "missing" }, {})).toBe(null);
  });

  it("var — default value", () => {
    expect(applyJsonLogic({ var: ["missing", "default"] }, {})).toBe("default");
  });

  it("var — nested path", () => {
    expect(applyJsonLogic({ var: "a.b" }, { a: { b: 99 } })).toBe(99);
  });

  it("== and !=", () => {
    expect(applyJsonLogic({ "==": [1, 1] }, {})).toBe(true);
    expect(applyJsonLogic({ "==": [1, "1"] }, {})).toBe(true); // loose
    expect(applyJsonLogic({ "!=": [1, 2] }, {})).toBe(true);
    expect(applyJsonLogic({ "!=": [1, 1] }, {})).toBe(false);
  });

  it("===", () => {
    expect(applyJsonLogic({ "===": [1, "1"] }, {})).toBe(false);
    expect(applyJsonLogic({ "===": [1, 1] }, {})).toBe(true);
  });

  it("comparison operators", () => {
    expect(applyJsonLogic({ ">": [5, 3] }, {})).toBe(true);
    expect(applyJsonLogic({ "<": [3, 5] }, {})).toBe(true);
    expect(applyJsonLogic({ ">=": [5, 5] }, {})).toBe(true);
    expect(applyJsonLogic({ "<=": [4, 5] }, {})).toBe(true);
  });

  it("< with 3 args (between)", () => {
    expect(applyJsonLogic({ "<": [1, 5, 10] }, {})).toBe(true);
    expect(applyJsonLogic({ "<": [1, 15, 10] }, {})).toBe(false);
  });

  it("! and !!", () => {
    expect(applyJsonLogic({ "!": [true] }, {})).toBe(false);
    expect(applyJsonLogic({ "!!": [0] }, {})).toBe(false);
    expect(applyJsonLogic({ "!!": [1] }, {})).toBe(true);
  });

  it("and / or", () => {
    expect(applyJsonLogic({ and: [true, true] }, {})).toBe(true);
    expect(applyJsonLogic({ and: [true, false] }, {})).toBe(false);
    expect(applyJsonLogic({ or: [false, true] }, {})).toBe(true);
    expect(applyJsonLogic({ or: [false, false] }, {})).toBe(false);
  });

  it("if / ternary", () => {
    expect(applyJsonLogic({ if: [true, "yes", "no"] }, {})).toBe("yes");
    expect(applyJsonLogic({ if: [false, "yes", "no"] }, {})).toBe("no");
    expect(applyJsonLogic({ "?:": [false, "yes", "no"] }, {})).toBe("no");
  });

  it("in — array membership", () => {
    expect(applyJsonLogic({ in: ["a", ["a", "b", "c"]] }, {})).toBe(true);
    expect(applyJsonLogic({ in: ["d", ["a", "b", "c"]] }, {})).toBe(false);
  });

  it("in — string contains", () => {
    expect(applyJsonLogic({ in: ["ll", "hello"] }, {})).toBe(true);
    expect(applyJsonLogic({ in: ["xx", "hello"] }, {})).toBe(false);
  });

  it("arithmetic +, -, *, /", () => {
    expect(applyJsonLogic({ "+": [2, 3] }, {})).toBe(5);
    expect(applyJsonLogic({ "-": [10, 3] }, {})).toBe(7);
    expect(applyJsonLogic({ "-": [5] }, {})).toBe(-5);
    expect(applyJsonLogic({ "*": [4, 3] }, {})).toBe(12);
    expect(applyJsonLogic({ "/": [10, 2] }, {})).toBe(5);
    expect(applyJsonLogic({ "%": [10, 3] }, {})).toBe(1);
  });

  it("min / max / abs", () => {
    expect(applyJsonLogic({ min: [3, 1, 2] }, {})).toBe(1);
    expect(applyJsonLogic({ max: [3, 1, 2] }, {})).toBe(3);
    expect(applyJsonLogic({ abs: [-5] }, {})).toBe(5);
  });

  it("cat", () => {
    expect(applyJsonLogic({ cat: ["hello", " ", "world"] }, {})).toBe("hello world");
  });

  it("missing", () => {
    expect(applyJsonLogic({ missing: ["a", "b"] }, { a: "x" })).toEqual(["b"]);
    expect(applyJsonLogic({ missing: ["a"] }, { a: "x" })).toEqual([]);
  });

  it("map", () => {
    const data = { items: [1, 2, 3] };
    const result = applyJsonLogic({ map: [{ var: "items" }, { "*": [{ var: "" }, 2] }] }, data);
    expect(result).toEqual([2, 4, 6]);
  });

  it("filter", () => {
    const data = { items: [1, 2, 3, 4] };
    const result = applyJsonLogic({ filter: [{ var: "items" }, { ">": [{ var: "" }, 2] }] }, data);
    expect(result).toEqual([3, 4]);
  });

  it("reduce", () => {
    const data = { items: [1, 2, 3] };
    const result = applyJsonLogic(
      { reduce: [{ var: "items" }, { "+": [{ var: "accumulator" }, { var: "current" }] }, 0] },
      data
    );
    expect(result).toBe(6);
  });

  it("does not throw on bad rule", () => {
    expect(() => applyJsonLogic({ badop: [] }, {})).not.toThrow();
    expect(applyJsonLogic({ badop: [] }, {})).toBe(null);
  });
});

describe("isTruthy", () => {
  it("returns false for falsy JSON Logic values", () => {
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy(0)).toBe(false);
    expect(isTruthy("")).toBe(false);
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy([])).toBe(false);
  });
  it("returns true for truthy values", () => {
    expect(isTruthy(true)).toBe(true);
    expect(isTruthy(1)).toBe(true);
    expect(isTruthy("hello")).toBe(true);
    expect(isTruthy([1])).toBe(true);
    expect(isTruthy({})).toBe(true);
  });
});
