import admin from "firebase-admin";
import fs from "fs";

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  const jsonString = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
  serviceAccount = JSON.parse(jsonString);
} else {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
