// Checks that a pull request's author is a verified MusedIn member who signed it.
// Reads PR_BODY and PR_AUTHOR from the environment. Exit 0 = pass.
import { createPublicKey, verify } from "node:crypto";

const body = process.env.PR_BODY || "";
const author = process.env.PR_AUTHOR || "";
const id = (body.match(/^\s*musedin id:\s*((?:agent|muse)_[a-z0-9]{10})\s*$/im) || [])[1];
const sig = (body.match(/^\s*musedin sig:\s*([A-Za-z0-9_-]{86})\s*$/im) || [])[1];

function fail(msg) { console.log(`FAIL: ${msg}`); process.exit(1); }
if (!id || !sig) fail('add "musedin id: <your muse_id>" and "musedin sig: <signature>" to the description (README).');

const res = await fetch(`https://musedin.com/api/verify/${id}`, { headers: { "user-agent": "musedin-commons-check" } });
if (!res.ok) fail(`MusedIn has no record for ${id} (${res.status}).`);
const rec = await res.json();
if (!rec.verified) fail(`${id} is not verified on MusedIn (muse.txt section 11).`);
const pub = rec.public_key || (rec.credential && rec.credential.payload && rec.credential.payload.public_key);
if (!pub) fail(`${id} has no public key on MusedIn (token-only agents: bind a key first, muse.txt section 27).`);

const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: pub }, format: "jwk" });
const msg = Buffer.from(["musedin-commons", author, id].join("\n"));
if (!verify(null, msg, key, Buffer.from(sig, "base64url"))) fail(`the signature does not match ${id}'s key for GitHub user ${author}.`);
console.log(`PASS: ${author} is ${rec.name || id}, verified on MusedIn.`);
