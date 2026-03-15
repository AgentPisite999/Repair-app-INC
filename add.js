require("dotenv").config();

const bcrypt = require("bcrypt");
const { db } = require("./config/database");

const users = [
  { user_id: "TestWH", password: "1234", role: "Warehouse - WH" },
  { user_id: "TestAdmin", password: "1234", role: "Admin" },
  { user_id: "TestDashboard", password: "1234", role: "Dashboard" },
  { user_id: "TestRM", password: "1234", role: "RM" },
  { user_id: "TestSuperAdmin", password: "1234", role: "SuperAdmin" },
];

async function bulkAddUsers() {
  let client;

  try {
    console.log(`Starting user import for ${users.length} users...`);

    client = await db.connect();
    await client.query("BEGIN");

    let inserted = 0;
    let updated = 0;

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      const result = await client.query(
        `
        INSERT INTO repair_app.users (user_id, password, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role
        RETURNING user_id, role
        `,
        [user.user_id, hashedPassword, user.role],
      );

      const existingCheck = await client.query(
        `SELECT user_id FROM repair_app.users WHERE user_id = $1`,
        [user.user_id],
      );

      if (existingCheck.rows.length > 0) {
        updated++;
      } else {
        inserted++;
      }

      console.log(`Done: ${result.rows[0].user_id} -> ${result.rows[0].role}`);
    }

    await client.query("COMMIT");

    console.log("====================================");
    console.log("User import completed successfully");
    console.log(`Total processed: ${users.length}`);
    console.log("====================================");

    process.exit(0);
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
    }
    console.error("Error during bulk user import:", err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

bulkAddUsers();
