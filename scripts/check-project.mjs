import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const expected = {
  address: "0xA701A047BE663dA232A068A1029E48f98c7bE521",
  deployTx: "0xc661ae5362281cf4bd6e1a0eb24f64e64b140828e37f80a18b31a71c88fc1391",
  sourceSha: "0695bb114b13f9921ee39db7a5afdf6d36e367339b258a257d404afaddbcd024",
};

const [page, contract] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../contract/PriorWordBind.py", import.meta.url)),
]);

const assertions = [
  [page.includes(expected.address), "frontend uses the verified Project contract address"],
  [page.includes(expected.deployTx), "frontend records the deployment transaction"],
  [createHash("sha256").update(contract).digest("hex") === expected.sourceSha, "contract source matches the frozen SHA-256"],
  [page.includes('"open_position"'), "open_position is wired"],
  [page.includes('"submit_followup"'), "submit_followup is wired"],
  [page.includes('"register_reliance"'), "register_reliance is wired"],
  [page.includes('"withdraw_reliance"'), "withdraw_reliance is wired"],
  [page.includes('"get_position"'), "get_position is wired"],
  [page.includes('"get_followups"'), "get_followups is wired"],
  [page.includes('"get_reliances"'), "get_reliances is wired"],
  [!page.includes("0x7bA831F9C232169807ce9C8Dda395BBD6Ec1CD02"), "frontend does not use the old Intelligent Contract address"],
];

let failed = false;
for (const [pass, label] of assertions) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  failed ||= !pass;
}

if (failed) process.exit(1);
console.log(`\n${assertions.length} critical project checks passed.`);
