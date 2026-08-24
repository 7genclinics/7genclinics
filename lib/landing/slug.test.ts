import assert from "node:assert/strict";
import test from "node:test";
import { isUuid, slugifyDoctorName } from "./slug.ts";

test("slugifyDoctorName builds shareable slugs", () => {
  assert.equal(slugifyDoctorName("Dr. Ahmed Khan"), "dr-ahmed-khan");
  assert.equal(slugifyDoctorName("Sara Khan"), "dr-sara-khan");
  assert.equal(slugifyDoctorName("Muhammad Ali"), "dr-muhammad-ali");
});

test("isUuid detects doctor profile ids", () => {
  assert.equal(isUuid("dr-ahmed-khan"), false);
  assert.equal(isUuid("2c1a8e3e-4b2a-4f1d-9c8b-1a2b3c4d5e6f"), true);
});
