const { db } = require("../config/database");

function extractNumericId(val) {
  if (!val || val === "all") return val;
  const match = String(val).match(/\d+/g);
  return match ? match.join("") : val;
}

const getDashboardStats = async (req, res) => {
  const month = req.query.month || "all";
  const year = req.query.year || "all";
  const storeId = extractNumericId(req.query.store_id || "all");
  const warehouseId = extractNumericId(req.query.warehouse_id || "all");

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (year !== "all") {
    conditions.push(
      `TO_CHAR("CreatedAt"::timestamp, 'YYYY') = $${paramIndex++}`,
    );
    params.push(String(year));
  }
  if (month !== "all") {
    conditions.push(`TO_CHAR("CreatedAt"::timestamp, 'MM') = $${paramIndex++}`);
    params.push(String(month).padStart(2, "0"));
  }
  if (storeId !== "all") {
    conditions.push(
      `REGEXP_REPLACE(UPPER(TRIM("Store_Id")), '[^0-9]', '', 'g') = $${paramIndex++}`,
    );
    params.push(String(storeId));
  }
  if (warehouseId !== "all") {
    conditions.push(
      `REGEXP_REPLACE(UPPER(TRIM("WarehouseID")), '[^0-9]', '', 'g') = $${paramIndex++}`,
    );
    params.push(String(warehouseId));
  }

  const whereClause = conditions.length
    ? "WHERE " + conditions.join(" AND ")
    : "";

  // ── KPIs ──
  const kpiSql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN LOWER(TRIM("Status")) = 'closed' THEN 1 ELSE 0 END) AS closed,
      SUM(CASE WHEN LOWER(TRIM("Status")) != 'closed' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN LOWER(TRIM("Vendor_Decision")) = 'repaired' THEN 1 ELSE 0 END) AS repaired,
      SUM(CASE WHEN LOWER(TRIM("Vendor_Decision")) = 'replaced' THEN 1 ELSE 0 END) AS replaced,
      AVG(CASE
        WHEN "Ticket_Closing_Date" IS NOT NULL AND "CreatedAt" IS NOT NULL
        THEN EXTRACT(EPOCH FROM ("Ticket_Closing_Date"::timestamp - "CreatedAt"::timestamp)) / 86400.0
        ELSE NULL
      END) AS avgtat
    FROM job_data ${whereClause}
  `;

  // ── Jobs by date ──
  const trendSql = `
    SELECT
      "CreatedAt"::date AS date,
      COUNT(*) AS count
    FROM job_data ${whereClause}
    GROUP BY "CreatedAt"::date
    ORDER BY "CreatedAt"::date ASC
  `;

  // ── Status distribution ──
  const statusSql = `
    SELECT TRIM("Status") AS status, COUNT(*) AS count
    FROM job_data ${whereClause}
    GROUP BY TRIM("Status")
    ORDER BY count DESC
  `;

  // ── Vendor decision counts ──
  const repairSql = `
    SELECT
      SUM(CASE WHEN LOWER(TRIM("Vendor_Decision")) = 'repaired' THEN 1 ELSE 0 END) AS repaired,
      SUM(CASE WHEN LOWER(TRIM("Vendor_Decision")) = 'replaced' THEN 1 ELSE 0 END) AS replaced
    FROM job_data ${whereClause}
  `;

  // ── Avg TAT by date ──
  const tatSql = `
    SELECT
      "CreatedAt"::date AS date,
      AVG(EXTRACT(EPOCH FROM ("Ticket_Closing_Date"::timestamp - "CreatedAt"::timestamp)) / 86400.0) AS avgtat
    FROM job_data
    ${whereClause ? whereClause + " AND " : "WHERE "}
    "Ticket_Closing_Date" IS NOT NULL AND "CreatedAt" IS NOT NULL
    GROUP BY "CreatedAt"::date
    ORDER BY "CreatedAt"::date ASC
  `;

  // ── Store list ──
  const storeListSql = `
    SELECT
      store_id AS id,
      TRIM(store_id || ' - ' || COALESCE(store_name, 'Unnamed Store')) AS name
    FROM "Store_Master"
    ORDER BY store_name ASC, store_id ASC
  `;

  // ── Warehouse list ──
  const warehouseListSql = `
    SELECT
      wh_id AS id,
      TRIM(wh_id || ' - ' || COALESCE(warehouse_name, 'Unnamed Warehouse')) AS name
    FROM "Warehouse_Master"
    ORDER BY warehouse_name ASC, wh_id ASC
  `;

  try {
    const [
      kpiResult,
      trendResult,
      statusResult,
      repairResult,
      tatResult,
      storeResult,
      whResult,
    ] = await Promise.all([
      db.query(kpiSql, params),
      db.query(trendSql, params),
      db.query(statusSql, params),
      db.query(repairSql, params),
      db.query(tatSql, params),
      db.query(storeListSql),
      db.query(warehouseListSql),
    ]);

    const kpiRow = kpiResult.rows[0] || {};
    const repairRow = repairResult.rows[0] || {};

    return res.json({
      success: true,
      kpi: {
        total: parseInt(kpiRow.total) || 0,
        closed: parseInt(kpiRow.closed) || 0,
        active: parseInt(kpiRow.active) || 0,
        repaired: parseInt(kpiRow.repaired) || 0,
        replaced: parseInt(kpiRow.replaced) || 0,
        avgTat: parseFloat(parseFloat(kpiRow.avgtat || 0).toFixed(2)),
      },
      jobsByDate: trendResult.rows || [],
      statusDist: statusResult.rows || [],
      repairVsReplace: {
        repaired: parseInt(repairRow.repaired) || 0,
        replaced: parseInt(repairRow.replaced) || 0,
      },
      tatByDate: (tatResult.rows || []).map((r) => ({
        date: r.date,
        avgTat: parseFloat(parseFloat(r.avgtat || 0).toFixed(2)),
      })),
      stores: storeResult.rows || [],
      warehouses: whResult.rows || [],
    });
  } catch (err) {
    console.error("[DA] Dashboard query error:", err.message);
    return res.status(500).json({
      success: false,
      message: "DB error",
      error: err.message,
    });
  }
};

module.exports = { getDashboardStats };
