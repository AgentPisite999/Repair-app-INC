const { db } = require("../config/database");

const getDashboardStats = async (req, res) => {
  try {
    const month = req.query.month || "all";
    const year = req.query.year || "all";
    const storeIds = (req.query.store_id || "all").trim();
    const warehouseIds = (req.query.warehouse_id || "all").trim();

    const userRole = (req.session.role || "").toLowerCase().trim();
    const userId = (req.session.userIdDisplay || req.session.userId || "")
      .toString()
      .trim();
    const isRM = userRole === "rm";

    let rmStoreValues = null;
    let rmStoreList = [];
    if (isRM && userId) {
      const rmResult = await db.query(
        'SELECT "Store_Code", "Branch_Name" FROM repair_app."RM_Data" WHERE TRIM("RM") = $1',
        [userId],
      );
      rmStoreList = rmResult.rows
        .map(function (r) {
          return {
            id: (r.Store_Code || "").trim(),
            name: (
              (r.Store_Code || "").trim() +
              " - " +
              (r.Branch_Name || "Unknown")
            ).trim(),
          };
        })
        .filter(function (item) {
          return item.id !== "";
        });

      if (rmStoreList.length > 0) {
        var rmCodes = rmStoreList.map(function (s) {
          return s.id;
        });
        var ph = rmCodes
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp = await db.query(
          'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph +
            ")" +
            ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph +
            ")",
          rmCodes,
        );
        rmStoreValues = lkp.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        rmCodes.forEach(function (code) {
          if (rmStoreValues.indexOf(code) === -1) rmStoreValues.push(code);
        });
        rmStoreList.forEach(function (s) {
          var bn = s.name.split(" - ").slice(1).join(" - ").trim();
          if (bn && rmStoreValues.indexOf(bn) === -1) rmStoreValues.push(bn);
        });
      } else {
        rmStoreValues = ["__NO_MATCH__"];
      }
    }

    let storeMatchValues = null;
    if (!isRM && storeIds !== "all") {
      var idList = storeIds
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (idList.length > 0) {
        var ph2 = idList
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp2 = await db.query(
          'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph2 +
            ")" +
            ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph2 +
            ")",
          idList,
        );
        storeMatchValues = lkp2.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        idList.forEach(function (id) {
          if (storeMatchValues.indexOf(id) === -1) storeMatchValues.push(id);
        });
      }
    }

    if (
      isRM &&
      storeIds !== "all" &&
      rmStoreValues &&
      rmStoreValues[0] !== "__NO_MATCH__"
    ) {
      var selectedList = storeIds
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (selectedList.length > 0) {
        var ph3 = selectedList
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp3 = await db.query(
          'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph3 +
            ")" +
            ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph3 +
            ")",
          selectedList,
        );
        var smv = lkp3.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        selectedList.forEach(function (id) {
          if (smv.indexOf(id) === -1) smv.push(id);
        });
        rmStoreList.forEach(function (s) {
          if (selectedList.indexOf(s.id) !== -1) {
            var bn = s.name.split(" - ").slice(1).join(" - ").trim();
            if (bn && smv.indexOf(bn) === -1) smv.push(bn);
          }
        });
        rmStoreValues = smv.length > 0 ? smv : ["__NO_MATCH__"];
      }
    }

    let warehouseMatchValues = null;
    if (!isRM && warehouseIds !== "all") {
      var idList2 = warehouseIds
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (idList2.length > 0) {
        var ph4 = idList2
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp4 = await db.query(
          'SELECT TRIM(wh_id) AS val FROM repair_app."Warehouse_Master" WHERE wh_id IN (' +
            ph4 +
            ")" +
            ' UNION SELECT TRIM(warehouse_name) AS val FROM repair_app."Warehouse_Master" WHERE wh_id IN (' +
            ph4 +
            ")",
          idList2,
        );
        warehouseMatchValues = lkp4.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        idList2.forEach(function (id) {
          if (warehouseMatchValues.indexOf(id) === -1)
            warehouseMatchValues.push(id);
        });
      }
    }

    var conditions = [];
    var params = [];
    var paramIndex = 1;

    if (year !== "all") {
      conditions.push(
        "TO_CHAR(\"CreatedAt\"::timestamp, 'YYYY') = $" + paramIndex,
      );
      params.push(String(year));
      paramIndex++;
    }
    if (month !== "all") {
      conditions.push(
        "TO_CHAR(\"CreatedAt\"::timestamp, 'MM') = $" + paramIndex,
      );
      params.push(String(month).padStart(2, "0"));
      paramIndex++;
    }

    if (isRM && rmStoreValues && rmStoreValues.length > 0) {
      var phRM = rmStoreValues
        .map(function () {
          return "$" + paramIndex++;
        })
        .join(", ");
      conditions.push('TRIM("Store_Id") IN (' + phRM + ")");
      rmStoreValues.forEach(function (v) {
        params.push(v);
      });
    }
    if (!isRM && storeMatchValues && storeMatchValues.length > 0) {
      var phS = storeMatchValues
        .map(function () {
          return "$" + paramIndex++;
        })
        .join(", ");
      conditions.push('TRIM("Store_Id") IN (' + phS + ")");
      storeMatchValues.forEach(function (v) {
        params.push(v);
      });
    }
    if (!isRM && warehouseMatchValues && warehouseMatchValues.length > 0) {
      var phW = warehouseMatchValues
        .map(function () {
          return "$" + paramIndex++;
        })
        .join(", ");
      conditions.push('TRIM("WarehouseID") IN (' + phW + ")");
      warehouseMatchValues.forEach(function (v) {
        params.push(v);
      });
    }

    var whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";
    var tatWhere = whereClause
      ? whereClause +
        ' AND "Ticket_Closing_Date" IS NOT NULL AND "CreatedAt" IS NOT NULL'
      : 'WHERE "Ticket_Closing_Date" IS NOT NULL AND "CreatedAt" IS NOT NULL';

    var kpiSql =
      "SELECT COUNT(*) AS total," +
      " SUM(CASE WHEN LOWER(TRIM(\"Status\")) = 'closed' THEN 1 ELSE 0 END) AS closed," +
      " SUM(CASE WHEN LOWER(TRIM(\"Status\")) != 'closed' THEN 1 ELSE 0 END) AS active," +
      " SUM(CASE WHEN LOWER(TRIM(\"Vendor_Decision\")) = 'repaired' THEN 1 ELSE 0 END) AS repaired," +
      " SUM(CASE WHEN LOWER(TRIM(\"Vendor_Decision\")) = 'replaced' THEN 1 ELSE 0 END) AS replaced," +
      ' AVG(CASE WHEN "Ticket_Closing_Date" IS NOT NULL AND "CreatedAt" IS NOT NULL' +
      ' THEN EXTRACT(EPOCH FROM ("Ticket_Closing_Date"::timestamp - "CreatedAt"::timestamp)) / 86400.0' +
      " ELSE NULL END) AS avgtat FROM repair_app.job_data " +
      whereClause;

    var trendSql =
      'SELECT "CreatedAt"::date AS date, COUNT(*) AS count FROM repair_app.job_data ' +
      whereClause +
      ' GROUP BY "CreatedAt"::date ORDER BY "CreatedAt"::date ASC';
    var statusSql =
      'SELECT TRIM("Status") AS status, COUNT(*) AS count FROM repair_app.job_data ' +
      whereClause +
      ' GROUP BY TRIM("Status") ORDER BY count DESC';
    var repairSql =
      "SELECT SUM(CASE WHEN LOWER(TRIM(\"Vendor_Decision\")) = 'repaired' THEN 1 ELSE 0 END) AS repaired, SUM(CASE WHEN LOWER(TRIM(\"Vendor_Decision\")) = 'replaced' THEN 1 ELSE 0 END) AS replaced FROM repair_app.job_data " +
      whereClause;
    var tatSql =
      'SELECT "CreatedAt"::date AS date, AVG(EXTRACT(EPOCH FROM ("Ticket_Closing_Date"::timestamp - "CreatedAt"::timestamp)) / 86400.0) AS avgtat FROM repair_app.job_data ' +
      tatWhere +
      ' GROUP BY "CreatedAt"::date ORDER BY "CreatedAt"::date ASC';

    var barcodeWhere = whereClause
      ? whereClause + ' AND "BARCODE" IS NOT NULL AND TRIM("BARCODE") != \'\''
      : 'WHERE "BARCODE" IS NOT NULL AND TRIM("BARCODE") != \'\'';
    var barcodeSql =
      'SELECT TRIM("BARCODE") AS barcode, COUNT(*) AS count FROM repair_app.job_data ' +
      barcodeWhere +
      ' GROUP BY TRIM("BARCODE") ORDER BY count DESC LIMIT 15';

    var itemWhere = whereClause
      ? whereClause + ' AND "ITEM_ID" IS NOT NULL AND TRIM("ITEM_ID") != \'\''
      : 'WHERE "ITEM_ID" IS NOT NULL AND TRIM("ITEM_ID") != \'\'';
    var itemSql =
      'SELECT TRIM("ITEM_ID") AS item_id, COUNT(*) AS count FROM repair_app.job_data ' +
      itemWhere +
      ' GROUP BY TRIM("ITEM_ID") ORDER BY count DESC LIMIT 15';

    var storeListSql =
      "SELECT store_id AS id, TRIM(store_id || ' - ' || COALESCE(store_name, 'Unnamed Store')) AS name FROM repair_app.\"Store_Master\" ORDER BY store_name ASC, store_id ASC";
    var warehouseListSql =
      "SELECT wh_id AS id, TRIM(wh_id || ' - ' || COALESCE(warehouse_name, 'Unnamed Warehouse')) AS name FROM repair_app.\"Warehouse_Master\" ORDER BY warehouse_name ASC, wh_id ASC";

    var queryPromises = [
      db.query(kpiSql, params),
      db.query(trendSql, params),
      db.query(statusSql, params),
      db.query(repairSql, params),
      db.query(tatSql, params),
      db.query(barcodeSql, params),
      db.query(itemSql, params),
    ];
    if (!isRM) {
      queryPromises.push(db.query(storeListSql));
      queryPromises.push(db.query(warehouseListSql));
    }

    var results = await Promise.all(queryPromises);
    var kpiRow = results[0].rows[0] || {};
    var repairRow = results[3].rows[0] || {};

    return res.json({
      success: true,
      isRM: isRM,
      kpi: {
        total: parseInt(kpiRow.total) || 0,
        closed: parseInt(kpiRow.closed) || 0,
        active: parseInt(kpiRow.active) || 0,
        repaired: parseInt(kpiRow.repaired) || 0,
        replaced: parseInt(kpiRow.replaced) || 0,
        avgTat: parseFloat(parseFloat(kpiRow.avgtat || 0).toFixed(2)),
      },
      jobsByDate: results[1].rows || [],
      statusDist: results[2].rows || [],
      repairVsReplace: {
        repaired: parseInt(repairRow.repaired) || 0,
        replaced: parseInt(repairRow.replaced) || 0,
      },
      tatByDate: (results[4].rows || []).map(function (r) {
        return {
          date: r.date,
          avgTat: parseFloat(parseFloat(r.avgtat || 0).toFixed(2)),
        };
      }),
      topBarcodes: results[5].rows || [],
      topItemIds: results[6].rows || [],
      stores: isRM ? rmStoreList : results[7] ? results[7].rows : [],
      warehouses: isRM ? [] : results[8] ? results[8].rows : [],
    });
  } catch (err) {
    console.error("[DA] Dashboard query error:", err);
    return res
      .status(500)
      .json({ success: false, message: "DB error", error: err.message });
  }
};

const getRawData = async (req, res) => {
  try {
    const month = req.query.month || "all";
    const year = req.query.year || "all";
    const storeIds = (req.query.store_id || "all").trim();
    const warehouseIds = (req.query.warehouse_id || "all").trim();

    const userRole = (req.session.role || "").toLowerCase().trim();
    const userId = (req.session.userIdDisplay || req.session.userId || "")
      .toString()
      .trim();
    const isRM = userRole === "rm";

    var conditions = [];
    var params = [];
    var paramIndex = 1;

    if (year !== "all") {
      conditions.push(
        "TO_CHAR(\"CreatedAt\"::timestamp, 'YYYY') = $" + paramIndex,
      );
      params.push(String(year));
      paramIndex++;
    }
    if (month !== "all") {
      conditions.push(
        "TO_CHAR(\"CreatedAt\"::timestamp, 'MM') = $" + paramIndex,
      );
      params.push(String(month).padStart(2, "0"));
      paramIndex++;
    }

    if (isRM && userId) {
      const rmResult = await db.query(
        'SELECT "Store_Code", "Branch_Name" FROM repair_app."RM_Data" WHERE TRIM("RM") = $1',
        [userId],
      );
      var rmCodes = rmResult.rows
        .map(function (r) {
          return (r.Store_Code || "").trim();
        })
        .filter(Boolean);
      if (rmCodes.length > 0) {
        var ph = rmCodes
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp = await db.query(
          'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph +
            ")" +
            ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph +
            ")",
          rmCodes,
        );
        var allVals = lkp.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        rmCodes.forEach(function (c) {
          if (allVals.indexOf(c) === -1) allVals.push(c);
        });
        rmResult.rows.forEach(function (r) {
          var bn = (r.Branch_Name || "").trim();
          if (bn && allVals.indexOf(bn) === -1) allVals.push(bn);
        });

        if (storeIds !== "all") {
          var selList = storeIds
            .split(",")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          var ph2 = selList
            .map(function (_, i) {
              return "$" + (i + 1);
            })
            .join(", ");
          var lkp2 = await db.query(
            'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
              ph2 +
              ")" +
              ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
              ph2 +
              ")",
            selList,
          );
          allVals = lkp2.rows
            .map(function (r) {
              return r.val;
            })
            .filter(Boolean);
          selList.forEach(function (id) {
            if (allVals.indexOf(id) === -1) allVals.push(id);
          });
        }

        var phF = allVals
          .map(function () {
            return "$" + paramIndex++;
          })
          .join(", ");
        conditions.push('TRIM("Store_Id") IN (' + phF + ")");
        allVals.forEach(function (v) {
          params.push(v);
        });
      } else {
        conditions.push("1=0");
      }
    } else if (storeIds !== "all") {
      var idList = storeIds
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (idList.length > 0) {
        var ph3 = idList
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp3 = await db.query(
          'SELECT TRIM(store_id) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph3 +
            ")" +
            ' UNION SELECT TRIM(store_name) AS val FROM repair_app."Store_Master" WHERE store_id IN (' +
            ph3 +
            ")",
          idList,
        );
        var sv = lkp3.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        idList.forEach(function (id) {
          if (sv.indexOf(id) === -1) sv.push(id);
        });
        var phS = sv
          .map(function () {
            return "$" + paramIndex++;
          })
          .join(", ");
        conditions.push('TRIM("Store_Id") IN (' + phS + ")");
        sv.forEach(function (v) {
          params.push(v);
        });
      }
    }

    if (!isRM && warehouseIds !== "all") {
      var idList2 = warehouseIds
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);
      if (idList2.length > 0) {
        var ph4 = idList2
          .map(function (_, i) {
            return "$" + (i + 1);
          })
          .join(", ");
        var lkp4 = await db.query(
          'SELECT TRIM(wh_id) AS val FROM repair_app."Warehouse_Master" WHERE wh_id IN (' +
            ph4 +
            ")" +
            ' UNION SELECT TRIM(warehouse_name) AS val FROM repair_app."Warehouse_Master" WHERE wh_id IN (' +
            ph4 +
            ")",
          idList2,
        );
        var wv = lkp4.rows
          .map(function (r) {
            return r.val;
          })
          .filter(Boolean);
        idList2.forEach(function (id) {
          if (wv.indexOf(id) === -1) wv.push(id);
        });
        var phW = wv
          .map(function () {
            return "$" + paramIndex++;
          })
          .join(", ");
        conditions.push('TRIM("WarehouseID") IN (' + phW + ")");
        wv.forEach(function (v) {
          params.push(v);
        });
      }
    }

    var whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    var sql =
      'SELECT "Job_Id","BARCODE","ITEM_ID","DIVISION","SECTION","DEPARTMENT","ProductUnder90Days","DamageReason",' +
      '"DeliveryDate","CustomerNumber","CustomerName","Email","Pincode","City","State","Address",' +
      '"Store_Id","WarehouseID","WarehouseName","CourierName","AWB","DispatchDate","WarehouseRemarks",' +
      '"Warehouse_Sent_Date","Warehouse_Receive_Date","Vendor_Name","Vendor_Awb","Gate_Pass_No",' +
      '"Vendor_Sent_Date","Vendor_Decision","Vendor_Decision_Date","Store_Sent_Date","Store_Received_Date",' +
      '"Ticket_Closing_Date","Closing_Ticket_Remarks","Merchandise_Decision","Merchandise_Action",' +
      '"Return_Store_AWB","Return_Store_Remarks","Status","CreatedAt"' +
      " FROM repair_app.job_data " +
      whereClause +
      " ORDER BY id DESC";

    var result = await db.query(sql, params);
    return res.json({ success: true, rows: result.rows || [] });
  } catch (err) {
    console.error("[DA] Raw data error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboardStats, getRawData };
