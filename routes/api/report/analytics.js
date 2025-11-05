const express = require("express");
const knex = require("../../../db/knex");
const moment = require("moment");
const helpers = require("../../../middlewares/_helpers");
const xl = require("excel4node");
const excel = require("node-excel-export");

const router = new express.Router();

//const Excel = require("exceljs");

router.get("/abc_yxz", (req, res) => {
  const company = req.userData.company; //18;
  const type = req.query.type; //1; //1-дни, 2-недели, 3-месяцы
  const days = req.query.period; //1; //1-день(90)/недели(13)/месяцы(6), 2-день(180)/недели(26)/месяцы(9), 3-день(360)/недели(52)/месяцы(12)
  const profit_amount =
    typeof req.query.profit_amount !== "undefined" &&
    req.query.profit_amount !== null
      ? req.query.profit_amount
      : "units"; // units/grossprofit
	req.query.profit = profit_amount;
	req.query.company = company;
	req.query.user = req.userData.id;
  const a =
    typeof req.query.a !== "undefined" && req.query.a !== null
      ? req.query.a
      : 80;
	req.query.a = a;
  const b =
    typeof req.query.b !== "undefined" && req.query.b !== null
      ? req.query.b
      : 95;
	req.query.b = b;
  const x =
    typeof req.query.x !== "undefined" && req.query.x !== null
      ? req.query.x
      : 10;
	req.query.x = x;
  const y =
    typeof req.query.y !== "undefined" && req.query.y !== null
      ? req.query.y
      : 25;
	req.query.y = y;
 	
	req.query.days = days;
	
	//console.log(req.query);
	
	knex.raw('select analytics.prepare_report(?)', [req.query])
	.then(result => {
		console.log("Result: ");
		console.log(result.rows);
		if (result.rows[0].prepare_report.code == 'success'){
			knex("analytics.temp_rep_collection")
			.select(
			  "name",
			  "code",
			  "total_line",
			  "share",
			  "cum_share",
			  "coeff",
			  "abc",
			  "xyz"
			).where({ "user":req.userData.id, "company": company})
			.orderBy("share", "desc")
			.then((abc_xyz) => {
				console.log("abc_xyz: ");
				console.log(abc_xyz)
				return res.status(200).json(abc_xyz);
			})
			.catch((err) => {
				return res.status(500).json(err);
			});
		}else return res.status(500).json(result.rows[0].collect_by_day);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

const styles = {
	header: {
		alignment:{
			vertical:"center",
			horizontal:"center",
			wrapText:true,
		},
	},
	cell: {
		alignment:{
			horizontal:"center"
		},
	},
};

router.get("/abc_xyz_excel", (req, res) => {
	
	//////05.10.2023
  
  let val="";
//   let curr = JSON.parse(helpers.decrypt(req.userData.locales));
  let curr = JSON.parse(req.userData.locales);

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023
	
	const specification_abc_xyz = {
		name:{
			displayName: "Наименование",
			headerStyle: styles.header,
			width: "50",
		},
		code:{
			displayName: "Штрихкод",
			headerStyle: styles.header,
			cellStyle: styles.cell,
			width: "15",
		},
		total_line:{
			
			//////05.10.2023
			//displayName: req.query.profit_amount == "units" ? "Всего продаж, шт.":"Всего валовая прибыль, тг.",
			displayName: req.query.profit_amount == "units" ? "Всего продаж, шт.":"Всего валовая прибыль, "+val,
			//////05.10.2023
	  
			
			headerStyle: styles.header,
			cellStyle: styles.cell,
			width: "14",
		},
		share:{
			displayName: "Доля в общем результате",
			headerStyle: styles.header,
			width: "17",
			cellFormat: function (value, row) {
			const res = value == null ? value : parseFloat(value) / 100;
			return res;
			},
			cellStyle: { numFmt: "0.0%",alignment:{horizontal:"center"}},
		},
		cum_share:{
			displayName: "Доля нарастающим итогом",
			headerStyle: styles.header,
			width: "18",
			cellFormat: function (value, row) {
			const res = value == null ? value : parseFloat(value) / 100;
			return res;
			},
			cellStyle: { numFmt: "0%",alignment:{horizontal:"center"}},
		},
		coeff:{
			displayName: "Коэффициент вариации продаж",
			headerStyle: styles.header,
			width: "17",
			cellFormat: function (value, row) {
			const res = value == null ? "Н/Д" : parseFloat(value) / 100;
			return res;
			},
			cellStyle: { numFmt: "0.00%",alignment:{horizontal:"center"}},
		},
		abc:{
			displayName: "ABC",
			headerStyle: styles.header,
			width: "5",
			cellStyle: function (value, row) {
				const res =
				  value == "A"
					? { fill: { fgColor: { rgb: "81c784" } },alignment:{horizontal:"center"}}
					: value == "B"
					? { fill: { fgColor: { rgb: "ffb74d" } },alignment:{horizontal:"center"}}
					: { fill: { fgColor: { rgb: "e57373" } },alignment:{horizontal:"center"}};
				return res;
			},
		},
		xyz:{
			displayName: "XYZ",
			headerStyle: styles.header,
			width: "5",
			cellStyle: function (value, row) {
				const res =
				  value == "X"
					? { fill: { fgColor: { rgb: "81c784" } },alignment:{horizontal:"center"}}
					: value == "Y"
					? { fill: { fgColor: { rgb: "ffb74d" } },alignment:{horizontal:"center"}}
					: value == "Z"
					? { fill: { fgColor: { rgb: "e57373" } },alignment:{horizontal:"center"}}
					: {};
				return res;
			},
		},
	};

	knex("analytics.temp_rep_collection")
	.select(
		"name",
		"code",
		"total_line",
		"share",
		"cum_share",
		"coeff",
		"abc",
		"xyz"
	).where({"user":req.userData.id, "company": req.userData.company})
	.orderBy("share", "desc")
	.then((abc_xyz) => {
		const report = excel.buildExport([
			{
				name: "Отчет abc_xyz",
				specification: specification_abc_xyz,
				data: abc_xyz,
			},
		]);
		return res.send(report);
	})
	.catch((err) => {
		return res.status(500).json(err);
	});
});

router.get("/details_excel", (req, res) => {
	const type = req.query.type;
	const days = req.query.period;
	

    //////05.10.2023
  
  let val="";
//   let curr = JSON.parse(helpers.decrypt(req.userData.locales));
  let curr = JSON.parse(req.userData.locales);
  

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023

	const specification_abc_xyz = {
		name:{
			displayName: "Наименование",
			headerStyle: styles.header,
			width: "50",
		},
		code:{
			displayName: "Штрихкод",
			headerStyle: styles.header,
			cellStyle: styles.cell,
			width: "15",
		},
		total_line:{
			
			//////05.10.2023
			//displayName: req.query.profit_amount == "units" ? "Всего продаж, шт.":"Всего валовая прибыль, тг.",
			displayName: req.query.profit_amount == "units" ? "Всего продаж, шт.":"Всего валовая прибыль, "+val,
			//////05.10.2023
			
			headerStyle: styles.header,
			cellStyle: styles.cell,
			width: "14",
		},
		share:{
			displayName: "Доля в общем результате",
			headerStyle: styles.header,
			width: "17",
			cellFormat: function (value, row) {
			const res = value == null ? value : parseFloat(value) / 100;
			return res;
			},
			cellStyle: {numFmt: "0.0%",alignment:{horizontal:"center"}},
		},
		cum_share:{
			displayName: "Доля нарастающим итогом",
			headerStyle: styles.header,
			width: "18",
			cellFormat: function (value, row) {
			const res = value == null ? value : parseFloat(value) / 100;
			return res;
			},
			cellStyle: { numFmt: "0%",alignment:{horizontal:"center"}},
		},
		coeff:{
			displayName: "Коэффициент вариации продаж",
			headerStyle: styles.header,
			width: "17",
			cellFormat: function (value, row) {
			const res = value == null ? "Н/Д" : parseFloat(value) / 100;
			return res;
			},
			cellStyle: { numFmt: "0.00%",alignment:{horizontal:"center"}},
		},
		abc:{
			displayName: "ABC",
			headerStyle: styles.header,
			width: "5",
			cellStyle: function (value, row) {
				const res =
				  value == "A"
					? { fill: { fgColor: { rgb: "81c784" } },alignment:{horizontal:"center"}}
					: value == "B"
					? { fill: { fgColor: { rgb: "ffb74d" } },alignment:{horizontal:"center"}}
					: { fill: { fgColor: { rgb: "e57373" } },alignment:{horizontal:"center"}};
				return res;
			},
		},
		xyz:{
			displayName: "XYZ",
			headerStyle: styles.header,
			width: "5",
			cellStyle: function (value, row) {
				const res =
				  value == "X"
					? { fill: { fgColor: { rgb: "81c784" } },alignment:{horizontal:"center"}}
					: value == "Y"
					? { fill: { fgColor: { rgb: "ffb74d" } },alignment:{horizontal:"center"}}
					: value == "Z"
					? { fill: { fgColor: { rgb: "e57373" } },alignment:{horizontal:"center"}}
					: {};
				return res;
			},
		},
	};

	// Для отображения дат (из-за транспонирования)
	knex
    .select()
    .modify(function () {
      if (type == 1) {
        this.select(
          knex.raw(
            `to_char(generate_series(current_date - ${days}, current_date-1,'1 day'::interval),'DD.MM.YYYY') as day`
          )
        );
      } else if (type == 2) {
        this.select(
          knex.raw(
            `to_char(generate_series(date_trunc('week',current_date - (interval '1 week' * ${days}))::date, current_date - interval '1 week','1 week'::interval),'DD.MM.YYYY') as day`
          )
        );
      } else if (type == 3) {
        this.select(
          knex.raw(
            `to_char(generate_series(date_trunc('month',current_date - (interval '1 month' * ${days-1}))::date, current_date,'1 month'::interval)::date-1,'Mon-YY') as day`
          )
        );
      }
    })
    .then((result) => {
      result.forEach((result, idx) => {
        count = `a${idx + 1}`;

		result.day = result.day.replace("Jan","Январь");
		result.day = result.day.replace("Feb","Февраль");
		result.day = result.day.replace("Mar","Март");
		result.day = result.day.replace("Apr","Апрель");
		result.day = result.day.replace("May","Май");
		result.day = result.day.replace("Jun","Июнь");
		result.day = result.day.replace("Jul","Июль");
		result.day = result.day.replace("Aug","Август");
		result.day = result.day.replace("Sep","Сентябрь");
		result.day = result.day.replace("Oct","Октябрь");
		result.day = result.day.replace("Nov","Ноябрь");
		result.day = result.day.replace("Dec","Декабрь");

        specification_abc_xyz[count] = {
          displayName: result.day,
          headerStyle: styles.header,
		  cellStyle: styles.cell,
          width: "11",
          cellFormat: function (value, row) {
            const res = value == null ? 'n/a' : parseFloat(value);
            return res;
          },
        };
      });
    });

	const sql =
    type == 1
      ? `SELECT r."code",r."total_line",r."share",r."cum_share",r."coeff",r."abc",r."xyz", ct.*
	  FROM   crosstab(
		  'select "name", dt, units from (
	  select t.product, t.company, t.code, t."name", sum(m.units) as units, t.total_line, t.dt from 
		  (
			  SELECT r.product, r.company, r.code, r."name", r.total_line, 
				  generate_series(current_date - `+days+`, current_date,''1 day''::interval)::date as dt
			  from analytics.temp_rep_collection r
			  where r.company = `+req.userData.company+` and r.user = `+req.userData.id+`
		  ) as t
	  LEFT JOIN analytics.sellinginfo_day m on (m.product = t.product and m.company = t.company and m."date" = t.dt)
	  group by t.product, t.company, t.code, t."name", t.total_line, t.dt
	  order by t.total_line desc, t.dt) b ORDER  BY 1,2'
	  )as ct ("name" varchar, 
	  	"a1" numeric, "a2" numeric, "a3" numeric, "a4" numeric, "a5" numeric, "a6" numeric, "a7" numeric, "a8" numeric, "a9" numeric, "a10" numeric,
		"a11" numeric, "a12" numeric, "a13" numeric, "a14" numeric, "a15" numeric, "a16" numeric, "a17" numeric, "a18" numeric, "a19" numeric, "a20" numeric, 
		"a21" numeric, "a22" numeric, "a23" numeric, "a24" numeric, "a25" numeric, "a26" numeric, "a27" numeric, "a28" numeric, "a29" numeric, "a30" numeric,
		"a31" numeric, "a32" numeric, "a33" numeric, "a34" numeric, "a35" numeric, "a36" numeric, "a37" numeric, "a38" numeric, "a39" numeric, "a40" numeric, 
		"a41" numeric, "a42" numeric, "a43" numeric, "a44" numeric, "a45" numeric, "a46" numeric, "a47" numeric, "a48" numeric, "a49" numeric, "a50" numeric, 
		"a51" numeric, "a52" numeric, "a53" numeric, "a54" numeric, "a55" numeric, "a56" numeric, "a57" numeric, "a58" numeric, "a59" numeric, "a60" numeric,
		"a61" numeric, "a62" numeric, "a63" numeric, "a64" numeric, "a65" numeric, "a66" numeric, "a67" numeric, "a68" numeric, "a69" numeric, "a70" numeric,
		"a71" numeric, "a72" numeric, "a73" numeric, "a74" numeric, "a75" numeric, "a76" numeric, "a77" numeric, "a78" numeric, "a79" numeric, "a80" numeric,
		"a81" numeric, "a82" numeric, "a83" numeric, "a84" numeric, "a85" numeric, "a86" numeric, "a87" numeric, "a88" numeric, "a89" numeric, "a90" numeric,
		"a91" numeric, "a92" numeric, "a93" numeric, "a94" numeric, "a95" numeric, "a96" numeric, "a97" numeric, "a98" numeric, "a99" numeric, "a100" numeric,
		"a101" numeric, "a102" numeric, "a103" numeric, "a104" numeric, "a105" numeric, "a106" numeric, "a107" numeric, "a108" numeric, "a109" numeric, "a110" numeric,
		"a111" numeric, "a112" numeric, "a113" numeric, "a114" numeric, "a115" numeric, "a116" numeric, "a117" numeric, "a118" numeric, "a119" numeric, "a120" numeric,
		"a121" numeric, "a122" numeric, "a123" numeric, "a124" numeric, "a125" numeric, "a126" numeric, "a127" numeric, "a128" numeric, "a129" numeric, "a130" numeric,
		"a131" numeric, "a132" numeric, "a133" numeric, "a134" numeric, "a135" numeric, "a136" numeric, "a137" numeric, "a138" numeric, "a139" numeric, "a140" numeric,
		"a141" numeric, "a142" numeric, "a143" numeric, "a144" numeric, "a145" numeric, "a146" numeric, "a147" numeric, "a148" numeric, "a149" numeric, "a150" numeric,
		"a151" numeric, "a152" numeric, "a153" numeric, "a154" numeric, "a155" numeric, "a156" numeric, "a157" numeric, "a158" numeric, "a159" numeric, "a160" numeric,
		"a161" numeric,	"a162" numeric, "a163" numeric, "a164" numeric, "a165" numeric, "a166" numeric, "a167" numeric, "a168" numeric, "a169" numeric, "a170" numeric,
		"a171" numeric, "a172" numeric,	"a173" numeric, "a174" numeric, "a175" numeric, "a176" numeric, "a177" numeric, "a178" numeric, "a179" numeric, "a180" numeric,
		"a181" numeric, "a182" numeric, "a183" numeric,	"a184" numeric, "a185" numeric, "a186" numeric, "a187" numeric, "a188" numeric, "a189" numeric, "a190" numeric,
		"a191" numeric, "a192" numeric, "a193" numeric, "a194" numeric,	"a195" numeric, "a196" numeric, "a197" numeric, "a198" numeric, "a199" numeric, "a200" numeric,
		"a201" numeric, "a202" numeric, "a203" numeric, "a204" numeric, "a205" numeric,	"a206" numeric, "a207" numeric, "a208" numeric, "a209" numeric, "a210" numeric,
		"a211" numeric, "a212" numeric, "a213" numeric, "a214" numeric, "a215" numeric, "a216" numeric,	"a217" numeric, "a218" numeric, "a219" numeric, "a220" numeric,
		"a221" numeric, "a222" numeric, "a223" numeric, "a224" numeric, "a225" numeric, "a226" numeric, "a227" numeric,	"a228" numeric, "a229" numeric, "a230" numeric, 
		"a231" numeric, "a232" numeric, "a233" numeric, "a234" numeric, "a235" numeric, "a236" numeric, "a237" numeric, "a238" numeric,	"a239" numeric, "a240" numeric, 
		"a241" numeric, "a242" numeric, "a243" numeric, "a244" numeric, "a245" numeric, "a246" numeric, "a247" numeric, "a248" numeric, "a249" numeric,	"a250" numeric, 
		"a251" numeric, "a252" numeric, "a253" numeric, "a254" numeric, "a255" numeric, "a256" numeric, "a257" numeric, "a258" numeric, "a259" numeric, "a260" numeric,
		"a261" numeric, "a262" numeric, "a263" numeric, "a264" numeric, "a265" numeric, "a266" numeric, "a267" numeric, "a268" numeric, "a269" numeric, "a270" numeric, 
		"a271" numeric,	"a272" numeric, "a273" numeric, "a274" numeric, "a275" numeric, "a276" numeric, "a277" numeric, "a278" numeric, "a279" numeric, "a280" numeric, 
		"a281" numeric, "a282" numeric,	"a283" numeric, "a284" numeric, "a285" numeric, "a286" numeric, "a287" numeric, "a288" numeric, "a289" numeric, "a290" numeric, 
		"a291" numeric, "a292" numeric, "a293" numeric,	"a294" numeric, "a295" numeric, "a296" numeric, "a297" numeric, "a298" numeric, "a299" numeric, "a300" numeric, 
		"a301" numeric, "a302" numeric, "a303" numeric, "a304" numeric,	"a305" numeric, "a306" numeric, "a307" numeric, "a308" numeric, "a309" numeric, "a310" numeric, 
		"a311" numeric, "a312" numeric, "a313" numeric, "a314" numeric, "a315" numeric,	"a316" numeric, "a317" numeric, "a318" numeric, "a319" numeric, "a320" numeric, 
		"a321" numeric, "a322" numeric, "a323" numeric, "a324" numeric, "a325" numeric, "a326" numeric,	"a327" numeric, "a328" numeric, "a329" numeric, "a330" numeric, 
		"a331" numeric, "a332" numeric, "a333" numeric, "a334" numeric, "a335" numeric, "a336" numeric, "a337" numeric,	"a338" numeric, "a339" numeric, "a340" numeric, 
		"a341" numeric, "a342" numeric, "a343" numeric, "a344" numeric, "a345" numeric, "a346" numeric, "a347" numeric, "a348" numeric,	"a349" numeric, "a350" numeric, 
		"a351" numeric, "a352" numeric, "a353" numeric, "a354" numeric, "a355" numeric, "a356" numeric, "a357" numeric, "a358" numeric, "a359" numeric,	"a360" numeric)
	  INNER JOIN analytics.temp_rep_collection r on (r."name" = ct.name)
	  ORDER BY r.total_line desc`
      : type == 2
      ? `SELECT r."code",r."total_line",r."share",r."cum_share",r."coeff",r."abc",r."xyz", ct.*
	  FROM   crosstab(
		  'select "name", dt, units from (
	  select t.product, t.company, t.code, t."name", sum(m.units) as units, t.total_line, t.dt from 
		  (
			  SELECT r.product, r.company, r.code, r."name", r.total_line, 
				  generate_series(date_trunc(''week'',current_date - (interval ''1 week'' * `+days+`))::date, current_date,''1 week''::interval)::date as dt
			  from analytics.temp_rep_collection r
			  where r.company = `+req.userData.company+` and r.user = `+req.userData.id+`
		  ) as t
	  LEFT JOIN analytics.sellinginfo_week m on (m.product = t.product and m.company = t.company and m."date" = t.dt)
	  group by t.product, t.company, t.code, t."name", t.total_line, t.dt
	  order by t.total_line desc, t.dt) b ORDER  BY 1,2'
	  )as ct ("name" varchar, 
		  "a1" numeric, "a2" numeric, "a3" numeric, "a4" numeric, "a5" numeric, "a6" numeric, "a7" numeric, "a8" numeric, "a9" numeric, "a10" numeric, 
		  "a11" numeric, "a12" numeric, "a13" numeric, "a14" numeric, "a15" numeric, "a16" numeric, "a17" numeric, "a18" numeric, "a19" numeric, "a20" numeric,
		  "a21" numeric, "a22" numeric, "a23" numeric, "a24" numeric, "a25" numeric, "a26" numeric, "a27" numeric, "a28" numeric, "a29" numeric, "a30" numeric,
		  "a31" numeric, "a32" numeric, "a33" numeric, "a34" numeric, "a35" numeric, "a36" numeric, "a37" numeric, "a38" numeric, "a39" numeric, "a40" numeric,
		  "a41" numeric, "a42" numeric, "a43" numeric, "a44" numeric, "a45" numeric, "a46" numeric, "a47" numeric, "a48" numeric, "a49" numeric, "a50" numeric,
		  "a51" numeric, "a52" numeric)
	  INNER JOIN analytics.temp_rep_collection r on (r."name" = ct.name)
	  ORDER BY r.total_line desc`
      : `SELECT r."code",r."total_line",r."share",r."cum_share",r."coeff",r."abc",r."xyz", ct.*
	  FROM   crosstab(
		  'select "name", dt, units from (
	  select t.product, t.company, t.code, t."name", sum(m.units) as units, t.total_line, t.dt from 
		  (
			  SELECT r.product, r.company, r.code, r."name", r.total_line, generate_series(
					  date_trunc(''month'', current_date-(interval ''1 month'' * ${days-1}))::date, 
					  current_date,
					  interval ''1 month'')::date - 1 as dt
			  from analytics.temp_rep_collection r
			  where r.company = `+req.userData.company+` and r.user = `+req.userData.id+`
		  ) as t
	  LEFT JOIN analytics.sellinginfo_month m on (m.product = t.product and m.company = t.company and m."date" = t.dt)
	  group by t.product, t.company, t.code, t."name", t.total_line, t.dt
	  order by t.total_line desc, t.dt) b ORDER  BY 1,2'
	  )as ct ("name" varchar, "a1" numeric,"a2" numeric,"a3" numeric,"a4" numeric, "a5" numeric, "a6" numeric, 
	  "a7" numeric,"a8" numeric,"a9" numeric,"a10" numeric,"a11" numeric,"a12" numeric)
	  INNER JOIN analytics.temp_rep_collection r on (r."name" = ct.name)
	  ORDER BY r.total_line desc`;

	knex.raw(sql).then((abc_xyz) => {
		abc_xyz.rows.forEach((count, idx) => {
		  count.index = idx + 1;
		});  
		const report = excel.buildExport([
		  {
			name: "Отчет abc_xyz детальный",
			specification: specification_abc_xyz,
			data: abc_xyz.rows,
		  },
		]);
		return res.send(report);
	})
	.catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	});
});

/*router.get("/abc_xyz_excel", (req, res) => {
  const company = 18; //req.userData.company; //18;
  const type = req.query.type; //1; //1-дни, 2-недели, 3-месяцы
  const period = req.query.period; //1; //1-день(90)/недели(13)/месяцы(6), 2-день(180)/недели(26)/месяцы(9), 3-день(360)/недели(52)/месяцы(12)
  const profit_amount =
    typeof req.query.profit_amount !== "undefined" &&
    req.query.profit_amount !== null
      ? req.query.profit_amount
      : "units"; // units/grossprofit
  const a =
    typeof req.query.a !== "undefined" && req.query.a !== null
      ? req.query.a
      : 80;
  const b =
    typeof req.query.b !== "undefined" && req.query.b !== null
      ? req.query.b
      : 95;
  const x =
    typeof req.query.x !== "undefined" && req.query.x !== null
      ? req.query.x
      : 10;
  const y =
    typeof req.query.y !== "undefined" && req.query.y !== null
      ? req.query.y
      : 25;
  let days;

  const specification_abc_xyz = {
    index: {
      displayName: "",
      headerStyle: styles.emptyCell,
      width: "6", // <- width in chars (when the number is passed as string)
    },
    name: {
      displayName: "Наименование",
      headerStyle: styles.emptyCell,
      width: "120", // <- width in chars (when the number is passed as string)
    },
    share: {
      displayName: "Доля в общем результате",
      headerStyle: styles.emptyCell,
      width: "23",
      cellFormat: function (value, row) {
        const res = value == null ? value : parseFloat(value) / 100;
        return res;
      },
      cellStyle: { numFmt: "0.0%" },
    },
    cum_share: {
      displayName: "Доля нарастающим итогом",
      headerStyle: styles.emptyCell,
      width: "25",
      cellFormat: function (value, row) {
        const res = value == null ? value : parseFloat(value) / 100;
        return res;
      },
      cellStyle: { numFmt: "0%" },
    },
    coeff: {
      displayName: "Коэффициент вариации продаж",
      headerStyle: styles.emptyCell,
      width: "29",
      cellFormat: function (value, row) {
        const res = value == null ? "Н/Д" : parseFloat(value) / 100;
        return res;
      },
      cellStyle: { numFmt: "0.00%" },
    },
    abc: {
      displayName: "ABC",
      headerStyle: styles.emptyCell,
      width: "10",
      cellStyle: function (value, row) {
        const res =
          value == "A"
            ? { fill: { fgColor: { rgb: "81c784" } } }
            : value == "B"
            ? { fill: { fgColor: { rgb: "ffb74d" } } }
            : { fill: { fgColor: { rgb: "e57373" } } };
        return res;
      },
    },
    xyz: {
      displayName: "XYZ",
      headerStyle: styles.emptyCell,
      width: "10",
      cellStyle: function (value, row) {
        const res =
          value == "X"
            ? { fill: { fgColor: { rgb: "81c784" } } }
            : value == "Y"
            ? { fill: { fgColor: { rgb: "ffb74d" } } }
            : value == "Z"
            ? { fill: { fgColor: { rgb: "e57373" } } }
            : {};
        return res;
      },
    },
  };

  // Определение количества дней/недель/месяцев
  // Дни
  if (type == 1 && period == 1) {
    days = 90;
  } else if (type == 1 && period == 2) {
    days = 180;
  } else if (type == 1 && period == 3) {
    days = 360;
    // Недели
  } else if (type == 2 && period == 1) {
    days = 13;
  } else if (type == 2 && period == 2) {
    days = 26;
  } else if (type == 2 && period == 3) {
    days = 52;
    // Месяцы
  } else if (type == 3 && period == 1) {
    days = 6;
  } else if (type == 3 && period == 2) {
    days = 9;
  } else if (type == 3 && period == 3) {
    days = 12;
  }

  // Все из-за Постгреса...
  const series =
    type == 1
      ? `generate_series(current_date - ${days}, current_date,''1 day''::interval)::date as day`
      : type == 2
      ? `generate_series(date_trunc(''week'',current_date - (interval ''1 week'' * ${days}))::date, current_date,''1 week''::interval)::date as day`
      : type == 3
      ? `generate_series(date_trunc(''month'',current_date - (interval ''1 month'' * ${days}))::date, current_date,''1 month''::interval)::date as day`
      : "";

  const series2 =
    type == 1
      ? `generate_series(current_date - ${days}, current_date,'1 day'::interval)::date as day`
      : type == 2
      ? `generate_series(date_trunc('week',current_date - (interval '1 week' * ${days}))::date, current_date,'1 week'::interval)::date as day`
      : type == 3
      ? `generate_series(date_trunc('month',current_date - (interval '1 month' * ${days}))::date, current_date,'1 month'::interval)::date as day`
      : "";

  const join =
    type == 1
      ? `analytics.sellinginfo_day`
      : type == 2
      ? `analytics.sellinginfo_week`
      : type == 3
      ? `analytics.sellinginfo_month`
      : "";

  const column =
    profit_amount == "units"
      ? `units`
      : profit_amount == "grossprofit"
      ? `gross_profit::numeric`
      : "";

  // Для отображения дат (из-за транспонирования)
  knex
    .select()
    .modify(function () {
      if (type == 1) {
        this.select(
          knex.raw(
            `to_char(generate_series(current_date - ${days}, current_date-1,'1 day'::interval),'DD.MM.YYYY') as day`
          )
        );
      } else if (type == 2) {
        this.select(
          knex.raw(
            `to_char(generate_series(date_trunc('week',current_date - (interval '1 week' * ${days}))::date, current_date - interval '1 week','1 week'::interval),'DD.MM.YYYY') as day`
          )
        );
      } else if (type == 3) {
        this.select(
          knex.raw(
            `to_char(generate_series(date_trunc('month',current_date - (interval '1 month' * ${days}))::date, current_date - interval '1 month','1 month'::interval),'DD.MM.YYYY') as day`
          )
        );
      }
    })
    .then((result) => {
      result.forEach((result, idx) => {
        count = `a${idx + 1}`;
        specification_abc_xyz[count] = {
          displayName: result.day,
          headerStyle: styles.emptyCell,
          width: "11",
          cellFormat: function (value, row) {
            const res = value == null ? value : parseFloat(value);
            return res;
          },
        };
      });
    });

  knex.raw(
      `SELECT count.*, count2.share, count2.cum_share, count2.coeff, count2.abc, count2.xyz
  			FROM   crosstab(
  				'select t.name, t.day, t.units
  						from (select p.name, p.day,
  							sum(d.` +
        column +
        `)::numeric as units,
  							round(sum(sum(d.` +
        column +
        `)) OVER (PARTITION BY p.name ORDER BY p.name),2) as total_line
  					from (
  						SELECT ` +
        series +
        `, company, id as product, name
  							FROM products
  								WHERE company = ${company}
  								AND deleted is false
  					) as p
  					left join ` +
        join +
        ` as d on (d.company = p.company and d.product = p.product and d.date = p.day)
  						group by p.day, p.name) t
  							where t.total_line is not null
  								order by 1, 2'
  			) AS "count" 	("name" varchar, "a1" numeric, "a2" numeric, "a3" numeric, "a4" numeric, "a5" numeric, "a6" numeric, "a7" numeric, "a8" numeric, "a9" numeric, "a10" numeric, "a11" numeric,
  								"a12" numeric, "a13" numeric, "a14" numeric, "a15" numeric, "a16" numeric, "a17" numeric, "a18" numeric, "a19" numeric, "a20" numeric, "a21" numeric, "a22" numeric, "a23" numeric,
  								"a24" numeric, "a25" numeric, "a26" numeric, "a27" numeric, "a28" numeric, "a29" numeric, "a30" numeric, "a31" numeric, "a32" numeric, "a33" numeric, "a34" numeric, "a35" numeric,
  								"a36" numeric, "a37" numeric, "a38" numeric, "a39" numeric, "a40" numeric, "a41" numeric, "a42" numeric, "a43" numeric, "a44" numeric, "a45" numeric, "a46" numeric, "a47" numeric,
  								"a48" numeric, "a49" numeric, "a50" numeric, "a51" numeric, "a52" numeric, "a53" numeric, "a54" numeric, "a55" numeric, "a56" numeric, "a57" numeric, "a58" numeric, "a59" numeric,
  								"a60" numeric, "a61" numeric, "a62" numeric, "a63" numeric, "a64" numeric, "a65" numeric, "a66" numeric, "a67" numeric, "a68" numeric, "a69" numeric, "a70" numeric, "a71" numeric,
  								"a72" numeric, "a73" numeric, "a74" numeric, "a75" numeric, "a76" numeric, "a77" numeric, "a78" numeric, "a79" numeric, "a80" numeric, "a81" numeric, "a82" numeric, "a83" numeric,
  								"a84" numeric, "a85" numeric, "a86" numeric, "a87" numeric, "a88" numeric, "a89" numeric, "a90" numeric, "a91" numeric, "a92" numeric, "a93" numeric, "a94" numeric, "a95" numeric,
  								"a96" numeric, "a97" numeric, "a98" numeric, "a99" numeric, "a100" numeric, "a101" numeric, "a102" numeric, "a103" numeric, "a104" numeric, "a105" numeric, "a106" numeric,
  								"a107" numeric, "a108" numeric, "a109" numeric, "a110" numeric, "a111" numeric, "a112" numeric, "a113" numeric, "a114" numeric, "a115" numeric, "a116" numeric, "a117" numeric,
  								"a118" numeric, "a119" numeric, "a120" numeric, "a121" numeric, "a122" numeric, "a123" numeric, "a124" numeric, "a125" numeric, "a126" numeric, "a127" numeric, "a128" numeric,
  								"a129" numeric, "a130" numeric, "a131" numeric, "a132" numeric, "a133" numeric, "a134" numeric, "a135" numeric, "a136" numeric, "a137" numeric, "a138" numeric, "a139" numeric,
  								"a140" numeric, "a141" numeric, "a142" numeric, "a143" numeric, "a144" numeric, "a145" numeric, "a146" numeric, "a147" numeric, "a148" numeric, "a149" numeric, "a150" numeric,
  								"a151" numeric, "a152" numeric, "a153" numeric, "a154" numeric, "a155" numeric, "a156" numeric, "a157" numeric, "a158" numeric, "a159" numeric, "a160" numeric, "a161" numeric,
  								"a162" numeric, "a163" numeric, "a164" numeric, "a165" numeric, "a166" numeric, "a167" numeric, "a168" numeric, "a169" numeric, "a170" numeric, "a171" numeric, "a172" numeric,
  								"a173" numeric, "a174" numeric, "a175" numeric, "a176" numeric, "a177" numeric, "a178" numeric, "a179" numeric, "a180" numeric, "a181" numeric, "a182" numeric, "a183" numeric,
  								"a184" numeric, "a185" numeric, "a186" numeric, "a187" numeric, "a188" numeric, "a189" numeric, "a190" numeric, "a191" numeric, "a192" numeric, "a193" numeric, "a194" numeric,
  								"a195" numeric, "a196" numeric, "a197" numeric, "a198" numeric, "a199" numeric, "a200" numeric, "a201" numeric, "a202" numeric, "a203" numeric, "a204" numeric, "a205" numeric,
  								"a206" numeric, "a207" numeric, "a208" numeric, "a209" numeric, "a210" numeric, "a211" numeric, "a212" numeric, "a213" numeric, "a214" numeric, "a215" numeric, "a216" numeric,
  								"a217" numeric, "a218" numeric, "a219" numeric, "a220" numeric, "a221" numeric, "a222" numeric, "a223" numeric, "a224" numeric, "a225" numeric, "a226" numeric, "a227" numeric,
  								"a228" numeric, "a229" numeric, "a230" numeric, "a231" numeric, "a232" numeric, "a233" numeric, "a234" numeric, "a235" numeric, "a236" numeric, "a237" numeric, "a238" numeric,
  								"a239" numeric, "a240" numeric, "a241" numeric, "a242" numeric, "a243" numeric, "a244" numeric, "a245" numeric, "a246" numeric, "a247" numeric, "a248" numeric, "a249" numeric,
  								"a250" numeric, "a251" numeric, "a252" numeric, "a253" numeric, "a254" numeric, "a255" numeric, "a256" numeric, "a257" numeric, "a258" numeric, "a259" numeric, "a260" numeric,
  								"a261" numeric, "a262" numeric, "a263" numeric, "a264" numeric, "a265" numeric, "a266" numeric, "a267" numeric, "a268" numeric, "a269" numeric, "a270" numeric, "a271" numeric,
  								"a272" numeric, "a273" numeric, "a274" numeric, "a275" numeric, "a276" numeric, "a277" numeric, "a278" numeric, "a279" numeric, "a280" numeric, "a281" numeric, "a282" numeric,
  								"a283" numeric, "a284" numeric, "a285" numeric, "a286" numeric, "a287" numeric, "a288" numeric, "a289" numeric, "a290" numeric, "a291" numeric, "a292" numeric, "a293" numeric,
  								"a294" numeric, "a295" numeric, "a296" numeric, "a297" numeric, "a298" numeric, "a299" numeric, "a300" numeric, "a301" numeric, "a302" numeric, "a303" numeric, "a304" numeric,
  								"a305" numeric, "a306" numeric, "a307" numeric, "a308" numeric, "a309" numeric, "a310" numeric, "a311" numeric, "a312" numeric, "a313" numeric, "a314" numeric, "a315" numeric,
  								"a316" numeric, "a317" numeric, "a318" numeric, "a319" numeric, "a320" numeric, "a321" numeric, "a322" numeric, "a323" numeric, "a324" numeric, "a325" numeric, "a326" numeric,
  								"a327" numeric, "a328" numeric, "a329" numeric, "a330" numeric, "a331" numeric, "a332" numeric, "a333" numeric, "a334" numeric, "a335" numeric, "a336" numeric, "a337" numeric,
  								"a338" numeric, "a339" numeric, "a340" numeric, "a341" numeric, "a342" numeric, "a343" numeric, "a344" numeric, "a345" numeric, "a346" numeric, "a347" numeric, "a348" numeric,
  								"a349" numeric, "a350" numeric, "a351" numeric, "a352" numeric, "a353" numeric, "a354" numeric, "a355" numeric, "a356" numeric, "a357" numeric, "a358" numeric, "a359" numeric,
  								"a360" numeric)
  		INNER JOIN (select t4.name, t4.share, t4.coeff, t4.cum_share, case when t4.cum_share <= ${a} then 'A' when t4.cum_share <= ${b} then 'B' else 'C' end as abc,
  																	  case when t4.coeff < 0 then null when t4.coeff <= ${x} then 'X' when t4.coeff <= ${y} then 'Y' when t4.coeff is null then 'Н/Д' else 'Z' end as xyz
  						from (select t3.name, t3.share, t3.coeff, round(sum(t3.share) OVER (ORDER BY t3.share desc, t3.total_line desc, t3.gross_profit desc, t3.name),2) as cum_share
  							from (
  								select t2.name, t2.share, t2.coeff, t2.total_line, t2.gross_profit
  									from (select t.name, t.total_line, round(coalesce(case when t.total > 0 then t.total_line/t.total else 0 end * 100,0)::numeric,4) as share,
  								               sum(t.gross_profit) as gross_profit,round(case when sum(t.` +
        column +
        `) <> 0 then (stddev_pop(t.` +
        column +
        `)/AVG(t.` +
        column +
        `)) * 100 else null end::numeric,2) as coeff
  											from (select p.name, p.day,
  												sum(d.units)::numeric as units,
  												sum(d.gross_profit::numeric) as gross_profit,
  													round(sum(sum(d.` +
        column +
        `)) OVER (PARTITION BY p.name ORDER BY p.name),2) as total_line,
  													round(coalesce(sum(sum(d.` +
        column +
        `)) OVER (),0),2) as total
  													from (
  														SELECT ` +
        series2 +
        `, company, id as product, name
  															FROM products
  																WHERE company = ${company}
  																	AND deleted is false
  													) as p
  							left join ` +
        join +
        ` as d on (d.company = p.company and d.product = p.product and d.date = p.day)
  								group by p.day, p.name) t
  									where t.total_line is not null
  										group by t.name, t.total_line, share
  											order by 1, 2) t2) t3) t4) count2 on (count.name = count2.name)
  												ORDER BY count2.share desc;
  `
    ).then((abc_xyz) => {
      helpers.serverLog("abc_xyz1");
      helpers.serverLog(abc_xyz.rows);
      helpers.serverLog("abc_xyz2");
      abc_xyz.rows.forEach((count, idx) => {
        count.index = idx + 1;
      });

      const report = excel.buildExport([
        // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: "Report", // <- Specify sheet name (optional)
          //heading: heading, // <- Raw heading array (optional)
          //merges: merges, // <- Merge cell ranges
          specification: specification_abc_xyz, // <- Report specification
          data: abc_xyz.rows, // <-- Report data
        },
      ]);

      // You can then return this straight
      //    res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
      //   return res.send({ abc: abc_xyz.rows, specification_abc_xyz });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});
*/
module.exports = router;

