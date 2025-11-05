const express = require("express");
const knex = require("../../db/knex");
const moment = require("moment");
const helpers = require("../../middlewares/_helpers");
const fileUpload = require("express-fileupload");
const request = require("request");
const forge = require("node-forge");
const fs = require("fs");

const router = new express.Router();
router.use(fileUpload());

//const host = "212.154.167.194:8443"; //тест
 const host = '212.154.167.193:8443'; //бой

const sessionService = `https://${host}/esf-web/ws/api1/SessionService?wsdl`;
const uploadInvoiceService = `https://${host}/esf-web/ws/api1/UploadInvoiceService?wsdl`;
const invoiceService = `https://${host}/esf-web/ws/api1/InvoiceService?wsdl`;

 const generateSignature = 'http://localhost:6666/LocalService?wsdl';
//const generateSignature = "http://192.168.0.20:6666/LocalService?wsdl";

const clearPem = (pem) => {
  return pem
    .replace("-----BEGIN CERTIFICATE-----", "")
    .replace("-----END CERTIFICATE-----", "");
};

const certificateToPem = (certType, password, callback) => {
  fs.readdir(`/mnt/esfcerts/${certType}`, (err, files) => {
    try {
      let fileName = "";
      fileName = files ? files[0] : null;
      let path = `/mnt/esfcerts/${certType}/${fileName}`;
      const keyFile = fs.readFileSync(path, "binary");
      const p12Asn1 = forge.asn1.fromDer(keyFile);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const bag = bags[forge.pki.oids.certBag][0];
      const pem = clearPem(forge.pki.certificateToPem(bag.cert));
      const content = { path, pem };
      callback(null, content);
    } catch (e) {
      callback(null, "");
    }
  });
};

router.get("/createSession", (req, res) => {
  const { certPassword, username } = req.query;
  certificateToPem("auth", certPassword, function (err, content) {
    const { pem } = content;
    // const {tin} = req.query;
    const tin = "180840004412";

    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header>
	   <wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
		  <wsse:UsernameToken wsu:Id="UsernameToken-664678CEF9FFC67AD214168421472821">
			 <wsse:Username>${username}</wsse:Username>
			 <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${req.query.isEsfPassword}</wsse:Password>            
		  </wsse:UsernameToken>
	   </wsse:Security>
	</soapenv:Header>
	<soapenv:Body>
	   <esf:createSessionRequest>
		  <tin>${tin}</tin>
		  <!--Optional:-->
		  <x509Certificate>${pem}</x509Certificate>
	   </esf:createSessionRequest>
	</soapenv:Body>
 </soapenv:Envelope>`;

    const soapOptions = {
      uri: sessionService,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Length": xml.length.toString(),
        Host: host,
        Connection: "keep-alive",
      },
      strictSSL: false,
      method: "POST",
      body: xml,
    };

    request(soapOptions, function (err, response) {
      res.status(200).send(response.body);
    });
  });
});

router.get("/closeSession", (req, res) => {
  const { tin, sessionId } = req.query;
  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header>
		<wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
			<wsse:UsernameToken wsu:Id="UsernameToken-664678CEF9FFC67AD214168421472821">
	  			<wsse:Username>${tin}</wsse:Username>
	   			<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${req.query.isEsfPassword}</wsse:Password>            
			</wsse:UsernameToken>
 		</wsse:Security>
	</soapenv:Header>
	<soapenv:Body>
		<esf:closeSessionRequest>
			<sessionId>${sessionId}</sessionId>
		</esf:closeSessionRequest>
	</soapenv:Body>
</soapenv:Envelope>`;

  const soapOptions = {
    uri: sessionService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": xml.length.toString(),
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml,
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body);
  });
});

router.get("/sessionStatus", (req, res) => {
  const { tin, sessionId } = req.query;
  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header>
		<wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
			<wsse:UsernameToken wsu:Id="UsernameToken-664678CEF9FFC67AD214168421472821">
	  			<wsse:Username>${tin}</wsse:Username>
	   			<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${req.query.isEsfPassword}</wsse:Password>            
			</wsse:UsernameToken>
 		</wsse:Security>
	</soapenv:Header>
	<soapenv:Body>
		<esf:currentSessionStatusRequest>
			<sessionId>${sessionId}</sessionId>
		</esf:currentSessionStatusRequest>
	</soapenv:Body>
</soapenv:Envelope>`;

  const soapOptions = {
    uri: sessionService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": xml.length.toString(),
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml,
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body);
  });
});

router.get("/queryInvoiceById", (req, res) => {
  const { sessionId, ids } = req.query;
  let idList = "";
  ids.forEach((id) => {
    idList = idList + `<id>${id}</id>`;
  });

  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header/>
	<soapenv:Body>
	   	<esf:queryInvoiceByIdRequest>
		  	<sessionId>${sessionId}</sessionId>
		  	<idList>
			 	<!--1 or more repetitions:-->
			 	${idList}
		  	</idList>
	   	</esf:queryInvoiceByIdRequest>
	</soapenv:Body>
</soapenv:Envelope>`;

  const soapOptions = {
    uri: invoiceService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": xml.length.toString(),
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml,
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body);
  });
});

router.get("/confirmInvoiceById", (req, res) => {
  const { sessionId, ids } = req.query;
  let idList = "";
  ids.forEach((id) => {
    idList = idList + `<id>${id}</id>`;
  });

  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header/>
	<soapenv:Body>
	 	<esf:confirmInvoiceByIdRequest>
	 		<sessionId>${sessionId}</sessionId>
	 		<idList>
	 			${idList}
	 		</idList>
	 	</esf:confirmInvoiceByIdRequest>
	</soapenv:Body>
</soapenv:Envelope>`;

  const soapOptions = {
    uri: invoiceService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Content-Length": xml.length.toString(),
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml,
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body);
  });
});

router.post("/syncInvoice", (req, res) => {
  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
		<soapenv:Header/>
		<soapenv:Body>${req.body.xml}</soapenv:Body>
	</soapenv:Envelope>`;

  const soapOptions = {
    uri: uploadInvoiceService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml.replace(/&/g, "&amp;"),
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body);
  });
});

router.post("/generateSignature", (req, res) => {
  const { xmls, certPassword } = req.body;
  let body = "";
  xmls.forEach((x) => {
    body = body + `<invoiceBody><![CDATA[${x}]]></invoiceBody>`;
  });

  certificateToPem("sign", certPassword, function (err, content) {
    const { path, pem } = content;

    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
		<soapenv:Header/>
		<soapenv:Body>
		<esf:signatureRequest>
			<invoiceBodies>
				<!--1 or more repetitions:-->
				${body}
			</invoiceBodies>
			<version>InvoiceV2</version>
			<certificatePath>/var/www/isme/${path.replace("./", "")}</certificatePath>
			<certificatePin>${certPassword}</certificatePin>
		</esf:signatureRequest>
		</soapenv:Body>
	</soapenv:Envelope>`;

    const soapOptions = {
      uri: generateSignature,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        Host: host,
        Connection: "keep-alive",
      },
      strictSSL: false,
      method: "POST",
      body: xml.replace(/&/g, "&amp;"),
    };

    request(soapOptions, function (err, response) {
      if (response) {
        // console.log(response.body)
        res.status(200).send({ invoicelist: response.body, pem });
      } else {
        console.log(err);
        res.status(500).send(err);
      }
    });
  });
});

router.get("/queryInvoice", (req, res) => {
  const { sessionId, dateFrom, dateTo, pageNum } = req.query;
  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esf="esf">
	<soapenv:Header/>
	<soapenv:Body>
	   <esf:queryInvoiceRequest>
		  <sessionId>${sessionId}</sessionId>
		 <criteria>
		  <direction>OUTBOUND</direction>
		  <dateFrom>${dateFrom}</dateFrom>
		  <dateTo>${dateTo}</dateTo>
		  <asc>true</asc>
		  <pageNum>${pageNum || 0}</pageNum>
		 </criteria>
	   </esf:queryInvoiceRequest>
	</soapenv:Body>
 </soapenv:Envelope>`;

  const soapOptions = {
    uri: invoiceService,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      Host: host,
      Connection: "keep-alive",
    },
    strictSSL: false,
    method: "POST",
    body: xml,
  };

  request(soapOptions, function (err, response) {
    res.status(200).send(response.body ? response.body : response);
  });
});

router.post("/formEsf", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select create_mass_fiz_esf(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].create_mass_fiz_esf;
      helpers.serverLog(req.originalUrl, result, result.code);

      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/removeEsf", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_delete(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_delete;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/detailsManagement", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_details_management(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_details_management;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

// {"company": 18, "user":1, "hasсontract": true, "contractnum": 517, "contractdate": 05.01.2017, "term": "безнал/нал.расчет", "transporttypecode": 99, "warrant": 112,
//	 "warrantdate": 01.09.2017, "destination": "В жопу", "deliveryconditioncode": "EXW", "сonsignortin": "12345", "сonsignorname": "ТОО Жопа", "сonsignoraddress": "Яблоксбург",
//	 "сonsigneetin": "54321", "сonsigneename": "ИП Жопа", "сonsigneeaddress": "Президентбург", "esfid":"5512"}
router.post("/management", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_management(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_management;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/esfUpdateStatus", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_update_status(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_update_status;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/esfRevising", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_revising(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_revising;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/esfInboundAcceptance", (req, res) => {
  const body = {
    user: req.userData.id,
    esflist: req.body,
  };
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_inbound_acceptance(?)", [body])
    .then((result) => {
      helpers.log(body, result.rows[0], result.fields[0].name, req.ip);

      helpers.serverLog(req.originalUrl, result, result.code);
      result = result.rows[0].esf_inbound_acceptance;
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

// select *
// from esf
// where company = 15
// and revise = false
// and type = 'INBOUND'

router.get("/getInboundInvoices", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("esf")
    .innerJoin("counterparties as c", "esf.seller", "c.id")
    .where({
      "esf.company": req.userData.company,
      "esf.revise": req.query.revise,
      "esf.type": "INBOUND",
    })
    .select("esf.*", "c.name as sellerName", "c.bin as sellerBin")
    .orderBy("esf.esfdate")
    .then((esf) => {
      helpers.serverLog(req.originalUrl, esf, "success");
      return res.status(200).json(esf);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/getInboundInvoiceDetails", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_list_for_revising(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_list_for_revising;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.post("/getInboundInvoiceDetails2", (req, res) => {
  req.body.user = req.userData.id;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select esf_list_for_revising(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_list_for_revising;
      helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

router.get("/truOriginCode", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("origincodes")
    .where({ deleted: false })
    .orderBy("id", "asc")
    .then((code) => {
      helpers.serverLog(req.originalUrl, code);
      return res.status(200).json(code);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// select *
// from invoices i
// where i.type = 2
// and i.status = 'ACCEPTED'
// and i.counterparty = 221
// and i.invoicedate::date = to_date('19.03.2019','DD.MM.YYYY')

router.get("/internalInvoices", (req, res) => {
  const dateInvoice = moment(req.query.dateInvoice);
  helpers.serverLog(req.originalUrl);

  knex("invoices")
    .where({ type: 2, status: "ACCEPTED", counterparty: req.query.seller })
    .andWhereBetween(knex.raw("invoicedate::date"), [
      dateInvoice.format(),
      dateInvoice.format(),
    ])
    .then((invoices) => {
      helpers.serverLog(req.originalUrl, invoices, "success");
      return res.status(200).json(invoices);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      console.log(err);
      return res.status(500).json(err);
    });
});

// SELECT l.units,l.newprice,l.purchaseprice,l.updateallprodprice,l.prodchanges,
//    case when i.type in (1,2) then p.name
//         else p2.name end,
//    case when i.type in (1,2) then p.code
//         else p2.code end,
//    case when i.type in (1,2) then p.cnofeacode
//         else p2.cnofeacode end,
//    case when i.type in (1,2) then p.taxid
//         else p2.taxid end,
//        array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = coalesce(s.attributes,s2.attributes)),', ') as attributes
//    FROM invoices i
//    LEFT JOIN invoicelist l on (l.invoice = i.invoicenumber)
//    LEFT JOIN stockcurrent s on (s.id = l.stockto)
//    LEFT JOIN products p on (p.id = s.product)
//    LEFT JOIN stockcurrent s2 on (s2.id = l.stock)
//    LEFT JOIN products p2 on (p2.id = s2.product)
//   WHERE i.invoicenumber = 465;

router.get("/invoice/details", (req, res) => {
  const { invoicenumbers } = req.query;
  console.log(invoicenumbers);
  const arr = invoicenumbers.map((number) => {
    console.log(number);
    return JSON.parse(number).invoicenumber;
  });
  console.log(arr);
  knex("invoices as i")
    .leftJoin("invoicelist as l", {
      "l.invoice": "i.invoicenumber",
      "l.company": "i.company",
    })
    .leftJoin("stockcurrent as s1", {
      "s1.id": "l.stockto",
      "s1.company": "l.company",
    })
    .leftJoin("products as p1", {
      "p1.id": "s1.product",
      "p1.company": "s1.company",
    })
    .leftJoin("stockcurrent as s2", {
      "s2.id": "l.stock",
      "s2.company": "l.company",
    })
    .leftJoin("products as p2", {
      "p2.id": "s2.product",
      "p2.company": "s2.company",
    })
    .whereIn("l.invoice", arr)
    .where({ "i.company": req.userData.company })
    .select(
      "l.units",
      "l.newprice",
      "l.comments as reason",
      "l.purchaseprice",
      "l.prodchanges",
      knex.raw("coalesce(p1.name,p2.name) as name"),
      knex.raw("coalesce(p1.code,p2.code) as code"),
      knex.raw(`
				case when i.type in (1,2) then p1.name 
					else p2.name end,
				case when i.type in (1,2) then p1.code
					else p2.code end,
				case when i.type in (1,2) then p1.cnofeacode
					else p2.cnofeacode end,
				case when i.type in (1,2) then p1.taxid
					else p2.taxid end
			`)
      ,
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = coalesce(s1.attributes,s2.attributes) and a.company = coalesce(s1.company,s2.company)),', ') as attributesCaption`
      )

    )
    .then((details) => {
      return res.status(200).json(details);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

// select distinct p.name as description, t.rate * 100 as ndsrate, p.cnofeacode as unitcode, max(sp.price)
// from products p
// inner join stockcurrent s on (s.product = p.id)
// inner join points p2 on (p2.id = s.point and p2.company = 15)
// inner join storeprices sp on (sp.stock = s.id)
// inner join taxes t on (t.id = p.taxid)
// where p.id = 2132
// group by p.name,t.rate,p.cnofeacode

router.get("/productInfo", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("products as p")
    .innerJoin("stockcurrent as s", {
      "s.product": "p.id",
      "s.company": "p.company",
    })
    .innerJoin("points as p2", {
      "p2.id": "s.point",
      "p2.company": "s.company",
    })
    .innerJoin("storeprices as sp", {
      "sp.stock": "s.id",
      "sp.company": "s.company",
    })
    .innerJoin("taxes as t", { "t.id": "p.taxid" })
    .where({ "p.id": req.query.id, "p2.company": req.userData.company })
    .distinct("p.name", "t.rate", "p.cnofeacode")
    .max("sp.price as pricewithtax")
    .groupBy("p.name", "t.rate", "p.cnofeacode")
    .first()
    .then((product) => {
      helpers.serverLog(req.originalUrl, product, "success");
      return res.status(200).json(product);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// select *
// from esf
// where company = 15
// and type = 'INBOUND'
// and status = 'CREATED'
// and revise is true;

router.get("/deffered", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("esf")
    .innerJoin("counterparties as c", "esf.seller", "c.id")
    .where({
      "esf.company": req.userData.company,
      "esf.revise": true,
      "esf.type": "INBOUND",
      "esf.status": "CREATED",
    })
    .select("esf.*", "c.name as sellerName", "c.bin as sellerBin")
    .orderBy("esf.esfdate")
    .then((esf) => {
      helpers.serverLog(req.originalUrl, esf, "success");
      return res.status(200).json(esf);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// select e.*, s.rus
// from esf e
// left join esf_statuses s on (e.status = s.code)
// where e.turnoverdate::date between to_date('01.03.2019','DD.MM.YYYY') and to_date('31.03.2019','DD.MM.YYYY')
// and e.type = 'OUTBOUND';

router.get("/sended", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const company = req.userData.company;

  helpers.serverLog(req.originalUrl);
  knex("esf")
    .leftJoin("esf_statuses", { "esf.status": "esf_statuses.code" })
    .leftJoin("customers", {
      "esf.custid": "customers.id",
      "esf.company": "customers.company",
    })
    .where({ "esf.type": "OUTBOUND", "esf.company": company })
    .andWhereBetween(knex.raw("esf.turnoverdate::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      "esf.id","esf.esfid","esf.esfregnum","esf.esfaccountingnumber","esf.type","esf.subtype","esf.usr","esf.company","esf.status","esf.revise","esf.currencycode","esf.contractdate",
	  "esf.contractnum","esf.hascontract","esf.term","esf.transporttypecode","esf.warrant","esf.warrantdate","esf.custid","esf.seller","esf.reason","esf.relationesregnum","esf.deliverydocnum",
	  "esf.deliverydocdate","esf.totalndsamount","esf.totalpricewithtax","esf.totalpricewithouttax","esf.totalturnoversize","esf.totalexciseamount","esf.destination","esf.deliveryconditioncode",
	  "esf.сonsignortin","esf.сonsignorname","esf.сonsignoraddress","esf.сonsigneetin","esf.сonsigneename","esf.сonsigneeaddress",
	  knex.raw(`to_char(esf.esfdate,'DD.MM.YYYY') as esfdate`),
	  knex.raw(`to_char(esf.lastupdate,'DD.MM.YYYY') as lastupdate`),
	  knex.raw(`to_char(esf.turnoverdate,'DD.MM.YYYY') as turnoverdate`),	  
      "esf_statuses.rus as esfstatusname",
      knex.raw(`coalesce(customers.name,'Физическое лицо') as cusname`),
      "customers.bin as cusbin"
    )
    .orderBy("esf.id")
    .then((esf) => {
      helpers.serverLog(req.originalUrl, esf, "success");
      return res.status(200).json(esf);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/cert", (req, res) => {
  helpers.serverLog(req.originalUrl);

  const type = req.query.type;
  let folder = `/mnt/esfcerts/${type}`;

  fs.readdir(folder, (err, files) => {
    if (err) {
      helpers.serverLog(req.originalUrl, err, "error");
      res.status(500).json({});
    }
    helpers.serverLog(req.originalUrl, files, "success");
    res.status(200).json(files);
  });
});

router.post("/uploadCert", (req, res) => {
  let uploadFile = req.files.file;
  const fileName = req.files.file.name;
  let path = "sign";

  if (fileName.includes("AUTH")) {
    path = "auth";
  }

  uploadFile.mv(`/mnt/esfcerts/${path}/${fileName}`, function (err) {
    if (err) {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).send(err);
    }

    res.status(200).json({
      file: `/mnt/esfcerts/${path}/${fileName}`,
    });
  });
});

// {"user": 1, "company": 1, "transaction":[{"id":1}]}
router.post("/createOneEsf", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select esf_create(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].esf_create;
      helpers.serverLog(req.originalUrl, result, result.code);

      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

// Поиск транзакций для привязки к ЭСФ (пока только юр)
router.get("/findTransactions", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point = req.query.point;
  const client = "jur";
  const company = req.userData.company;

  knex("transactions")
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transactions.company",
    })
    .innerJoin("cashboxes", "cashboxes.id", "transactions.cashbox")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    .leftJoin("customers", {
      "transactions.customerid": "customers.id",
      "transactions.company": "customers.company",
    })
    .where({
      "transactions.company": company,
      "points.id": point,
      "transactions.tickettype": "0",
    })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .where((pt) => {
      client !== "jur"
        ? pt.andWhereNot({ "transactions.fiz_customerid": "0" })
        : pt.andWhereNot({ "transactions.customerid": "0" });
    })
    .select(
      "transactions.id",
      "transactions.date",
      "transactions.price",
      "cashboxes.name as cashbox",
      "cashbox_users.name as cashboxuser",
      "points.id as pointid",
      "points.name as pointname",
      "customers.name",
      "customers.bin"
    )
    .orderBy("transactions.date", "desc")
    .then((transactions) => {
      transactions.forEach((transaction) => {
        transaction.pointname = helpers.decrypt(transaction.pointname);
        transaction.cashbox = helpers.decrypt(transaction.cashbox);
      });
      return res.status(200).json(transactions);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

// deliverycondition/transporttype
router.get("/getspr", (req, res) => {
  const name = req.query.name;

  if (name == "deliverycondition") {
    knex("esfdeliverycondition")
      .select(
        "esfdeliverycondition.id",
        knex.raw(
          "(esfdeliverycondition.id||' - '||esfdeliverycondition.name) as name"
        )
      )
      .where({ deleted: false })
      .orderBy("esfdeliverycondition.id")
      .then((esfdeliverycondition) => {
        return res.status(200).json(esfdeliverycondition);
      })
      .catch((err) => {
        return res.status(500).json(err);
      });
  } else if (name == "transporttype") {
    knex("esftransporttype")
      .select(
        "esftransporttype.id",
        knex.raw("(esftransporttype.id||' - '||esftransporttype.name) as name")
      )
      .where({ deleted: false })
      .orderBy("esftransporttype.id")
      .then((esftransporttype) => {
        return res.status(200).json(esftransporttype);
      })
      .catch((err) => {
        return res.status(500).json(err);
      });
  } else {
    return res
      .status(200)
      .json({ error: "Некорректное наименование справочника!" });
  }
});

router.get("/getFormationJurEsf", (req, res) => {
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;

  helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select get_jur_esf(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].get_jur_esf;
      helpers.serverLog(req.originalUrl, result, result.code);

      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, result, "error");
      return res.status(500).json(err);
    });
});

module.exports = router;
