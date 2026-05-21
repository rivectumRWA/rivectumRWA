type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (typeof i === "string" || typeof i === "number") {
      out.push(String(i));
    } else if (Array.isArray(i)) {
      const c = clsx(...i);
      if (c) out.push(c);
    } else if (typeof i === "object") {
      for (const [k, v] of Object.entries(i)) {
        if (v) out.push(k);
      }
    }
  }
  return out.join(" ");
}
