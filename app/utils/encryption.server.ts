import crypto from "node:crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32 || ENCRYPTION_KEY === "v-32-character-long-string-helper") {
  console.error("CRITICAL SECURITY ERROR: ENCRYPTION_KEY is missing, too short, or using default value.");
}

function getKey() {
  if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY process.env is missing.");
  return Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(12); // GCM standard IV is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted + ":" + authTag, // Append authTag for storage
  };
}

export function decrypt(encryptedData: string, iv: string) {
  const [data, authTag] = encryptedData.split(":");
  if (!data || !authTag) throw new Error("Invalid encrypted data format (missing auth tag)");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "hex")
  );
  
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
