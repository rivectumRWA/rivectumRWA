import { describe, it, expect } from "bun:test";
import { pickAllocation } from "../src/strategy";

describe("pickAllocation", () => {
  it("allocates 60% to highest APY, 40% to second", () => {
    const result = pickAllocation([
      { address: "0x0000000000000000000000000000000000000aaa", apyBps: 500 },
      { address: "0x0000000000000000000000000000000000000bbb", apyBps: 300 },
    ]);
    expect(result).toEqual([
      { asset: "0x0000000000000000000000000000000000000aaa", bps: 6000 },
      { asset: "0x0000000000000000000000000000000000000bbb", bps: 4000 },
    ]);
  });

  it("respects 60% cap even with one asset", () => {
    const result = pickAllocation([
      { address: "0x0000000000000000000000000000000000000aaa", apyBps: 1000 },
    ]);
    expect(result).toEqual([
      { asset: "0x0000000000000000000000000000000000000aaa", bps: 6000 },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(pickAllocation([])).toEqual([]);
  });

  it("sorts by APY descending", () => {
    const result = pickAllocation([
      { address: "0x0000000000000000000000000000000000000111", apyBps: 100 },
      { address: "0x0000000000000000000000000000000000000222", apyBps: 999 },
    ]);
    expect(result[0].asset).toBe("0x0000000000000000000000000000000000000222");
    expect(result[1].asset).toBe("0x0000000000000000000000000000000000000111");
  });
});
