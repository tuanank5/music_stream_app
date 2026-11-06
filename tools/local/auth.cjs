const fs = require("node:fs");
const path = require("node:path");

const {
  configureLocalAdmin,
  checkEmulators,
} = require("./environment.cjs");

async function main() {
  const { auth, env } = configureLocalAdmin();

  // Kiểm tra kết nối Emulator trước khi ghi dữ liệu
  await checkEmulators(env);

  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (
    !emulatorHost ||
    !["127.0.0.1:9099", "localhost:9099"].includes(emulatorHost)
  ) {
    throw new Error(
      "Chưa xác nhận Firebase Auth Emulator tại localhost:9099"
    );
  }

  const file = path.resolve("data/local/auth.json");
  const users = JSON.parse(fs.readFileSync(file, "utf8"));

  if (!Array.isArray(users)) {
    throw new Error("auth.json phải chứa một mảng tài khoản");
  }

  const resetPasswords = process.argv.includes("--reset-passwords");

  for (const user of users) {
    if (!user.uid || !user.email || !user.password) {
      throw new Error(`Tài khoản thiếu dữ liệu: ${user.uid}`);
    }

    const fields = {
      email: user.email,
      displayName: user.displayName || "",
      emailVerified: user.emailVerified ?? true,
      disabled: user.disabled ?? false,
    };

    try {
      await auth.createUser({
        uid: user.uid,
        ...fields,
        password: user.password,
      });

      console.log(`Created: ${user.email}`);
    } catch (error) {
      if (error.code !== "auth/uid-already-exists") {
        throw error;
      }

      if (resetPasswords) {
        fields.password = user.password;
      }

      await auth.updateUser(user.uid, fields);

      console.log(`Updated: ${user.email}`);
    }
  }

  console.log(`Imported ${users.length} Auth accounts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});