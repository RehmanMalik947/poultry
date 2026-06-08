const crypto = require("crypto");

// 16-byte static key (Aap isko apni marzi ke mutabiq tabdeel bhi kar sakte hain)
const SECRET_KEY = "salon_pos_key_12"; 

/**
 * Encrypts a numeric ID to a hex string
 */
function encryptOrgId(id) {
  if (!id) return null;
  const cipher = crypto.createCipheriv("aes-128-ecb", SECRET_KEY, null);
  let encrypted = cipher.update(String(id), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypts a hex string back to a numeric ID string
 */
function decryptOrgId(encryptedHex) {
  try {
    if (!encryptedHex) return null;
    const decipher = crypto.createDecipheriv("aes-128-ecb", SECRET_KEY, null);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return parseInt(decrypted, 10);
  } catch (e) {
    return null;
  }
}

module.exports = {
  encryptOrgId,
  decryptOrgId
};
