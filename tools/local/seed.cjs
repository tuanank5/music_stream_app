const { configureLocalAdmin, checkEmulators } = require("./environment.cjs");
const { buildFixtures, PASSWORD } = require("./fixtures.cjs");

async function seedLocal() {
  const { auth, db, env } = configureLocalAdmin();
  await checkEmulators(env);
  const { users, documents } = buildFixtures();
  for (const user of users) {
    const fields = {
      email: user.email,
      displayName: user.displayName,
      password: PASSWORD,
      emailVerified: true,
    };
    try {
      await auth.createUser({ uid: user.uid, ...fields });
    } catch (error) {
      if (error.code !== "auth/uid-already-exists") throw error;
      await auth.updateUser(user.uid, fields);
    }
  }
  for (let start = 0; start < documents.length; start += 400) {
    const batch = db.batch();
    for (const document of documents.slice(start, start + 400))
      batch.set(db.doc(document.path), document.data);
    await batch.commit();
  }
  console.log(
    `Seeded ${users.length} local Auth accounts, ${documents.length} fixture documents. No collections deleted.`,
  );
  return { users: users.length, documents: documents.length };
}

if (require.main === module)
  seedLocal()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
module.exports = { seedLocal };
