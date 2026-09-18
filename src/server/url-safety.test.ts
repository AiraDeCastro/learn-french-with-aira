import { describe, expect, it, vi } from "vitest";
import { assertPubliclyFetchable, isPrivateOrLocalAddress } from "./url-safety";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

describe("isPrivateOrLocalAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata endpoint
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fc00::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ])("flags %s as private/local", (address) => {
    expect(isPrivateOrLocalAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])(
    "does not flag %s as private/local",
    (address) => {
      expect(isPrivateOrLocalAddress(address)).toBe(false);
    },
  );

  it("fails closed on something that isn't a recognizable IP", () => {
    expect(isPrivateOrLocalAddress("not-an-ip")).toBe(true);
  });
});

describe("assertPubliclyFetchable", () => {
  it("rejects a non-http(s) scheme", async () => {
    await expect(assertPubliclyFetchable("file:///etc/passwd")).rejects.toThrow(
      /http:\/\/ and https:\/\//,
    );
  });

  it("rejects localhost by name, without needing DNS", async () => {
    await expect(assertPubliclyFetchable("http://localhost:5432/")).rejects.toThrow(
      /local address/,
    );
  });

  it("rejects an IP-literal private address directly in the URL", async () => {
    // A cloud metadata endpoint — the canonical real-world SSRF target.
    await expect(
      assertPubliclyFetchable("http://169.254.169.254/latest/meta-data"),
    ).rejects.toThrow(/private address/);
  });

  it("accepts an IP-literal public address without needing DNS", async () => {
    const url = await assertPubliclyFetchable("http://8.8.8.8/x");
    expect(url.hostname).toBe("8.8.8.8");
  });

  it("rejects a hostname that resolves to a private address", async () => {
    const { lookup } = await import("node:dns/promises");
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "127.0.0.1", family: 4 },
    ] as never);

    await expect(
      assertPubliclyFetchable("http://internal.example.test/"),
    ).rejects.toThrow(/private address/);
  });

  it("accepts a hostname that resolves to a public address", async () => {
    const { lookup } = await import("node:dns/promises");
    vi.mocked(lookup).mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as never);

    const url = await assertPubliclyFetchable("https://example.test/article");
    expect(url.hostname).toBe("example.test");
  });
});
