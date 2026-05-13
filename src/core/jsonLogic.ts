/**
 * Minimal JSON Logic evaluator.
 * Covers all operators used by the FF backend dependency engine.
 * Safe: never throws — bad rules return null.
 */

type Rule = unknown;
type Data = Record<string, unknown>;

export function applyJsonLogic(rule: Rule, data: Data): unknown {
  try {
    return _apply(rule, data);
  } catch {
    return null;
  }
}

function _apply(rule: Rule, data: Data): unknown {
  // Primitives / arrays (not a rule object) → return as-is
  if (rule === null || rule === undefined) return rule;
  if (typeof rule !== "object" || Array.isArray(rule)) return rule;

  const obj = rule as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return obj;

  const op = keys[0];
  const rawArgs = obj[op];
  // Evaluate each argument (recursive)
  const a: unknown[] = Array.isArray(rawArgs)
    ? rawArgs.map((arg: unknown) => _apply(arg, data))
    : [_apply(rawArgs, data)];

  switch (op) {
    // -----------------------------------------------------------------------
    // Variable access
    // -----------------------------------------------------------------------
    case "var": {
      const path = a[0] as string | null | undefined;
      if (path === "" || path === null || path === undefined) {
        // Inside map/filter/etc., "" key holds the current item
        return ("" in data) ? data[""] : data;
      }
      const parts = String(path).split(".");
      let cur: unknown = data;
      for (const part of parts) {
        if (cur === null || cur === undefined) return a[1] ?? null;
        cur = (cur as Record<string, unknown>)[part];
      }
      // Flutter backend wraps field values as {value: actual}.
      // If the condition uses {"var": "field_id.value"} but our data is flat
      // (field_id → actualValue), fall back to the shorter path.
      if ((cur === null || cur === undefined) && String(path).endsWith(".value")) {
        const shorterPath = String(path).slice(0, -6); // strip ".value"
        let cur2: unknown = data;
        for (const part of shorterPath.split(".")) {
          if (cur2 === null || cur2 === undefined) return a[1] ?? null;
          cur2 = (cur2 as Record<string, unknown>)[part];
        }
        return cur2 ?? a[1] ?? null;
      }
      return cur ?? a[1] ?? null;
    }

    // -----------------------------------------------------------------------
    // Equality
    // -----------------------------------------------------------------------
    case "==":
      return a[0] == a[1]; // intentional loose
    case "===":
      return a[0] === a[1];
    case "!=":
      return a[0] != a[1];
    case "!==":
      return a[0] !== a[1];

    // -----------------------------------------------------------------------
    // Comparison
    // -----------------------------------------------------------------------
    case "<":
      return a.length === 3
        ? (a[0] as number) < (a[1] as number) && (a[1] as number) < (a[2] as number)
        : (a[0] as number) < (a[1] as number);
    case "<=":
      return a.length === 3
        ? (a[0] as number) <= (a[1] as number) && (a[1] as number) <= (a[2] as number)
        : (a[0] as number) <= (a[1] as number);
    case ">":
      return a.length === 3
        ? (a[0] as number) > (a[1] as number) && (a[1] as number) > (a[2] as number)
        : (a[0] as number) > (a[1] as number);
    case ">=":
      return a.length === 3
        ? (a[0] as number) >= (a[1] as number) && (a[1] as number) >= (a[2] as number)
        : (a[0] as number) >= (a[1] as number);

    // -----------------------------------------------------------------------
    // Logic
    // -----------------------------------------------------------------------
    case "!":
      return !a[0];
    case "!!":
      return !!a[0];
    case "and": {
      // Short-circuit: re-evaluate from rawArgs
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      let last: unknown = true;
      for (const arg of arr) {
        last = _apply(arg, data);
        if (!last) return last;
      }
      return last;
    }
    case "or": {
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      let last: unknown = false;
      for (const arg of arr) {
        last = _apply(arg, data);
        if (last) return last;
      }
      return last;
    }
    case "if":
    case "?:": {
      const arr = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
      for (let i = 0; i < arr.length - 1; i += 2) {
        if (_apply(arr[i], data)) return _apply(arr[i + 1], data);
      }
      return arr.length % 2 === 1 ? _apply(arr[arr.length - 1], data) : null;
    }

    // -----------------------------------------------------------------------
    // Array / membership
    // -----------------------------------------------------------------------
    case "in": {
      const [needle, haystack] = a;
      if (typeof haystack === "string") return haystack.includes(String(needle));
      if (Array.isArray(haystack)) return haystack.includes(needle);
      return false;
    }
    case "some": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return false;
      return list.some((item) =>
        _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "all": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return false;
      if (list.length === 0) return false;
      return list.every((item) =>
        _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "filter": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return [];
      return list.filter((item) =>
        _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "map": {
      const [arr2, subRule] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return [];
      return list.map((item) =>
        _apply(subRule, { ...data, "": item, current: item })
      );
    }
    case "reduce": {
      const [arr2, subRule, initial] = Array.isArray(rawArgs) ? rawArgs : [];
      const list = _apply(arr2, data);
      if (!Array.isArray(list)) return _apply(initial, data);
      return list.reduce(
        (acc, cur) =>
          _apply(subRule, { ...data, accumulator: acc, current: cur }),
        _apply(initial, data)
      );
    }
    case "merge":
      return (a as unknown[]).reduce<unknown[]>(
        (acc, val) =>
          Array.isArray(val) ? [...acc, ...val] : [...acc, val],
        []
      );
    case "count":
      return Array.isArray(a[0]) ? a[0].length : 0;

    // -----------------------------------------------------------------------
    // Arithmetic
    // -----------------------------------------------------------------------
    case "+":
      return (a as number[]).reduce((s, v) => s + (Number(v) || 0), 0);
    case "-":
      return a.length === 1
        ? -(a[0] as number)
        : (a[0] as number) - (a[1] as number);
    case "*":
      return (a as number[]).reduce((p, v) => p * (Number(v) || 0), 1);
    case "/":
      return (a[0] as number) / (a[1] as number);
    case "%":
      return (a[0] as number) % (a[1] as number);
    case "min":
      return Math.min(...(a as number[]));
    case "max":
      return Math.max(...(a as number[]));
    case "abs":
      return Math.abs(a[0] as number);

    // -----------------------------------------------------------------------
    // String
    // -----------------------------------------------------------------------
    case "cat":
      return (a as unknown[]).map(String).join("");
    case "substr": {
      const str = String(a[0] ?? "");
      const start = Number(a[1]) || 0;
      const len = a[2] !== undefined ? Number(a[2]) : undefined;
      return len !== undefined ? str.substr(start, len) : str.substr(start);
    }
    case "log":
      // Dev helper — pass through
      return a[0];

    // -----------------------------------------------------------------------
    // Missing
    // -----------------------------------------------------------------------
    case "missing": {
      const keys2 = Array.isArray(a[0]) ? (a[0] as string[]) : (a as string[]);
      return keys2.filter((k) => {
        const val = _apply({ var: k }, data);
        return val === null || val === undefined || val === "";
      });
    }
    case "missing_some": {
      const [min, keys2] = a as [number, string[]];
      const missing = keys2.filter((k) => {
        const val = _apply({ var: k }, data);
        return val === null || val === undefined || val === "";
      });
      return missing.length >= min ? missing : [];
    }

    // -----------------------------------------------------------------------
    // Fallback
    // -----------------------------------------------------------------------
    default:
      return null;
  }
}

/** Truthy check matching JSON Logic spec */
export function isTruthy(value: unknown): boolean {
  if (value === false || value === 0 || value === "" || value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
