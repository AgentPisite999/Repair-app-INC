require("dotenv").config();

const bcrypt = require("bcrypt");
const { db } = require("./config/database");

const users = [
  // Test Users
  { user_id: "Test", password: "1234", role: "Store" },
  // { user_id: "TestAdmin", password: "1234", role: "Admin" },
  // { user_id: "TestDashboard", password: "1234", role: "Dashboard" },
  // { user_id: "TestRM", password: "1234", role: "RM" },
  // { user_id: "TestSuperAdmin", password: "1234", role: "SuperAdmin" },

  // // Store Users
  // { user_id: "AAD", password: "aad5092", role: "Store" },
  // { user_id: "ABA", password: "aba5033", role: "Store" },
  // { user_id: "ABL", password: "abl5121", role: "Store" },
  // { user_id: "ACG", password: "acg5001", role: "Store" },
  // { user_id: "ALF", password: "alf5002", role: "Store" },
  // { user_id: "APP", password: "app5089", role: "Store" },
  // { user_id: "ARD", password: "ard5003", role: "Store" },
  // { user_id: "BBN", password: "bbn5061", role: "Store" },
  // { user_id: "BFF", password: "bff5083", role: "Store" },
  // { user_id: "BHP", password: "bhp5009", role: "Store" },
  // { user_id: "BHY", password: "bhy5021", role: "Store" },
  // { user_id: "BIO", password: "bio5005", role: "Store" },
  // { user_id: "BJN", password: "bjn5118", role: "Store" },
  // { user_id: "BLM", password: "blm5090", role: "Store" },
  // { user_id: "BMA", password: "bma5091", role: "Store" },
  // { user_id: "BMM", password: "bm5018", role: "Store" },
  // { user_id: "BPX", password: "bpx5019", role: "Store" },
  // { user_id: "BTC", password: "btc5125", role: "Store" },
  // { user_id: "CAL", password: "cal5026", role: "Store" },
  // { user_id: "CHD", password: "chd5010", role: "Store" },
  // { user_id: "CHS", password: "chs5070", role: "Store" },
  // { user_id: "CLQ", password: "clq5027", role: "Store" },
  // { user_id: "CMS", password: "cms5056", role: "Store" },
  // { user_id: "CRH", password: "crh5060", role: "Store" },
  // { user_id: "DKN", password: "dkn5099", role: "Store" },
  // { user_id: "DLF", password: "dlf5038", role: "Store" },
  // { user_id: "DPF", password: "dpf5096", role: "Store" },
  // { user_id: "DPJ", password: "dpj5087", role: "Store" },
  // { user_id: "DPN", password: "dpn5076", role: "Store" },
  // { user_id: "GAM", password: "gam5071", role: "Store" },
  // { user_id: "GBN", password: "gbn5098", role: "Store" },
  // { user_id: "GGS", password: "ggs5049", role: "Store" },
  // { user_id: "GMG", password: "gmg5130", role: "Store" },
  // { user_id: "GRK", password: "grk5094", role: "Store" },
  // { user_id: "HGB", password: "hgb5116", role: "Store" },
  // { user_id: "HGM", password: "hgm5120", role: "Store" },
  // { user_id: "HGV", password: "hgv5075", role: "Store" },
  // { user_id: "HSC", password: "hsc5065", role: "Store" },
  // { user_id: "IAB", password: "iab5102", role: "Store" },
  // { user_id: "ICQ", password: "icq5044", role: "Store" },
  // { user_id: "ICT", password: "ict5084", role: "Store" },
  // { user_id: "IOM", password: "iom5023", role: "Store" },
  // { user_id: "JDP", password: "jdp5014", role: "Store" },
  // { user_id: "JRN", password: "jrn5067", role: "Store" },
  // { user_id: "JRO", password: "jro5101", role: "Store" },
  // { user_id: "KHI", password: "khi5124", role: "Store" },
  // { user_id: "KLU", password: "klu5020", role: "Store" },
  // { user_id: "KNP", password: "knp5015", role: "Store" },
  // { user_id: "LKP", password: "lkp5074", role: "Store" },
  // { user_id: "LLU", password: "llu5078", role: "Store" },
  // { user_id: "MAX", password: "max5032", role: "Store" },
  // { user_id: "MBS", password: "mbs5117", role: "Store" },
  // { user_id: "MDR", password: "mdr5030", role: "Store" },
  // { user_id: "MHS", password: "mhs5051", role: "Store" },
  // { user_id: "MIT", password: "mit5064", role: "Store" },
  // { user_id: "MIV", password: "miv5059", role: "Store" },
  // { user_id: "MJN", password: "mjn5103", role: "Store" },
  // { user_id: "MLR", password: "mlr5088", role: "Store" },
  // { user_id: "MPX", password: "mpx5031", role: "Store" },
  // { user_id: "MSC", password: "msc5105", role: "Store" },
  // { user_id: "MSW", password: "msw5048", role: "Store" },
  // { user_id: "MVR", password: "mvr5058", role: "Store" },
  // { user_id: "NDP", password: "ndp5079", role: "Store" },
  // { user_id: "NFM", password: "nfm5122", role: "Store" },
  // { user_id: "NSK", password: "nsk5037", role: "Store" },
  // { user_id: "OBM", password: "obm5034", role: "Store" },
  // { user_id: "PBT", password: "pbt5080", role: "Store" },
  // { user_id: "PCC", password: "pcc5077", role: "Store" },
  // { user_id: "PHK", password: "phk5040", role: "Store" },
  // { user_id: "PJM", password: "pjm5104", role: "Store" },
  // { user_id: "PMM", password: "pmm5093", role: "Store" },
  // { user_id: "PMW", password: "pmw5126", role: "Store" },
  // { user_id: "PNM", password: "pnm5111", role: "Store" },
  // { user_id: "PPM", password: "ppm5115", role: "Store" },
  // { user_id: "PPX", password: "ppx5039", role: "Store" },
  // { user_id: "RCM", password: "rcm5035", role: "Store" },
  // { user_id: "RGN", password: "rgn5086", role: "Store" },
  // { user_id: "RJG", password: "rjg5112", role: "Store" },
  // { user_id: "RJV", password: "rjv5131", role: "Store" },
  // { user_id: "RKO", password: "rko5097", role: "Store" },
  // { user_id: "RMM", password: "rmm5106", role: "Store" },
  // { user_id: "RUN", password: "run5107", role: "Store" },
  // { user_id: "RZM", password: "rzm5119", role: "Store" },
  // { user_id: "SCC", password: "scc5052", role: "Store" },
  // { user_id: "SLP", password: "slp5085", role: "Store" },
  // { user_id: "SPP", password: "spp5082", role: "Store" },
  // { user_id: "SVM", password: "svm5062", role: "Store" },
  // { user_id: "TIM", password: "tim5055", role: "Store" },
  // { user_id: "UDM", password: "udm5113", role: "Store" },
  // { user_id: "UDR", password: "udr5114", role: "Store" },
  // { user_id: "UGM", password: "ugm5110", role: "Store" },
  // { user_id: "UMR", password: "umr5095", role: "Store" },
  // { user_id: "VJD", password: "vjd5024", role: "Store" },
  // { user_id: "YMM", password: "ymm5109", role: "Store" },

  // // Admin / Special Users
  // { user_id: "Admin", password: "INC5@123#654", role: "Admin" },
  // { user_id: "User01", password: "User#078!", role: "Dashboard" },
  // { user_id: "WH1093", password: "INC5WH1093", role: "Warehouse - 1093" },

  // // RM Users
  // { user_id: "Kunal", password: "Kunal#590", role: "RM" },
  // { user_id: "Azahar", password: "Azahar#3378", role: "RM" },
  // { user_id: "Anil", password: "Anil#5973", role: "RM" },
  // { user_id: "KARANJEET", password: "KARANJEET#66345", role: "RM" },
  // { user_id: "Raheem", password: "Raheem#52341", role: "RM" },
  // { user_id: "Amit", password: "Amit#8964", role: "RM" },

  // SuperAdmin
  { user_id: "SuperAdmin", password: "INC5!@#45", role: "SuperAdmin" },
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

      const existingCheck = await client.query(
        `SELECT user_id FROM repair_app.users WHERE user_id = $1`,
        [user.user_id],
      );

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
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
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