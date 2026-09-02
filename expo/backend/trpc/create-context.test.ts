import { describe, expect, test } from "bun:test";
import { getBearerToken } from "./create-context";

describe("protected tRPC bearer parsing", () => {
  test("requires a non-empty bearer token", () => {
    expect(getBearerToken(new Request("http://localhost"))).toBeNull();
    expect(getBearerToken(new Request("http://localhost", {
      headers: { authorization: "Basic not-a-bearer" },
    }))).toBeNull();
    expect(getBearerToken(new Request("http://localhost", {
      headers: { authorization: "Bearer " },
    }))).toBeNull();
  });

  test("trims and returns the session token", () => {
    expect(getBearerToken(new Request("http://localhost", {
      headers: { authorization: "Bearer  session-token  " },
    }))).toBe("session-token");
  });
});