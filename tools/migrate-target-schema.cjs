const { main } = require("./backend/backfill.cjs");
const { migrateTargetSchema } = require("./backend/target-migration.cjs");
main(process.argv.slice(2), migrateTargetSchema)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
