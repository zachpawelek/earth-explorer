import test from "node:test";
import assert from "node:assert/strict";
import { isTownFacingCamera } from "./townCatalog.js";

const camera = { x: 0, y: 0, z: 2 };
test("front towns are selectable and far-side towns are not", () => {
  assert.equal(isTownFacingCamera({ latitude: 0, longitude: 0 }, camera), true);
  assert.equal(isTownFacingCamera({ latitude: 0, longitude: 180 }, camera), false);
  assert.equal(isTownFacingCamera({ latitude: 0, longitude: 90 }, camera), false);
});
