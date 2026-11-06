const { main } = require("./backend/backfill.cjs");
const { restoreTargetSchema } = require("./backend/target-restore.cjs");
main(process.argv.slice(2), async (db, options) => ({
  ...(await restoreTargetSchema(db, options)),
  errors: [],
}))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
