const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {
	
	const isweight = typeof req.query.isweight !== "undefined" && req.query.isweight !== null ? Boolean(req.query.isweight) : Boolean(false);
	
	knex('invoices')
		.where({
			'company': req.userData.company, 'creator': req.userData.id,
			'status': req.query.status, 'type': req.query.type, 'isweight': isweight
		})
		.first()
		.then(invoices => {
			//console.log('TEST ' + isweight);
			return res.status(200).json(invoices);
		}).catch((err) => {
			console.log(err.stack);
			return res.status(500).json(err);
		});
});

router.get('/list', (req, res) => {
	knex('invoices')
		.where({
			'company': req.userData.company, 'creator': req.userData.id,
			'status': req.query.status, 'type': req.query.type, 'stockfrom': req.query.stockfrom
		})
		.then(invoices => {
			return res.status(200).json(invoices);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/types', (req, res) => {
	const invoicetypes = req.query.invoicetypes;

	knex('invoicetypes')
		.where({ 'invoicetypes.deleted': false })
		.whereIn('invoicetypes.id', invoicetypes)
		.then(invoices => {
			return res.status(200).json(invoices);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

///07.09.2022
router.get('/product1', (req, res) => {

	//console.log(req);
	
	knex.raw(`
	select * from
	(
	select invoicelist.invoice, invoicelist.stock, invoicelist.attributes,
				invoicelist.units as amount, invoicelist.newprice, invoicelist.purchaseprice,
				invoicelist.newprod, invoicelist.sku, invoicelist.pieceprice,
				products.code, products.name,coalesce(split_part(invoicelist.prodchanges, ',', 8)::boolean,products.piece) as piece
				, coalesce(split_part(invoicelist.prodchanges, ',', 9)::integer,products.pieceinpack) as pieceinpack,
				categories.name as category_name, categories.id as category_id,
				c.name as category_name_new,c.id as category_id_new,
				brands.brand as brand_name,brands.id as brand_id,
				b.brand as brand_name_new,b.id as brand_id_new,
				u.name as units_name_new,u.id as units_id_new,
				CASE WHEN products.id is null THEN true ELSE false END as is_new,
				product_static_prices.price as staticprice,
				invoicelist.hotkey,
				array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company),', ') as attributesCaption,
				invoicelist.attributes_json::text as attrs_json
				,invoicelist.numpor,
				-- 01.03.2023
				invoicelist.updateallprodprice,
				invoicelist.wholesale_price,
				products.unitsprid,
				u.name as unitspr_name,
				u.shortname 
				-- 01.03.2023
				
				-- 09.03.2023
				,coalesce(invoicelist.detales,0) as details
				,coalesce(invoicelist.detales_json::text,'[]') as details_json
				,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.detales and a.company = invoicelist.company),', ') as detailsCaption
				-- 09.03.2023
				
				-----23.05.2023
				/*
				,products."attributes" as attributes_products
				,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = products."attributes" and a.company = invoicelist.company),', ') as attributes_productsCaption
				,products.details as details_products
				,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = products.details and a.company = invoicelist.company),', ') as details_productsCaption
				*/
				-----23.05.2023
                
				-------28.10.2025
                ,invoicelist.id as  invoicelist_id
				-------28.10.2025

                

		 from invoices inner join invoicelist on  invoices.invoicenumber= invoicelist.invoice 
											  and invoices.company=invoicelist.company
					   inner join products   on products.id= invoicelist.stock and products.company= invoicelist.company
					   inner join categories on products.category=categories.id
					   left Join  categories as c on 
					    
                        
						-----23.02.2023
				         --split_part(invoicelist.prodchanges, ',', 1)::integer=c.id 
				        invoicelist.categoryid =c.id
				        -----23.02.2023
						and c.company=invoicelist.company
						
						
						
						inner join brands on brands.id=products.brand
					   left Join  brands as b on 
					   
					   
					   -----23.02.2023
				   ---split_part(invoicelist.prodchanges, ',', 4)::integer=b.id
				   invoicelist.brandid =b.id
				   -----23.02.2023
					   
					   left Join  unit_spr as u on 
					   --split_part(invoicelist.prodchanges, ',', 6)::integer=u.id
					   products.unitsprid = u.id
					   left Join product_static_prices on (
														   products.id= product_static_prices.product and
														   product_static_prices.company=products.company)
		 where invoices.company= '${req.userData.company}' and invoices.invoicenumber= '${req.query.invoicenumber}'	
					  
			union		   
		 select invoicelist.invoice, invoicelist.stock, invoicelist.attributes,
					invoicelist.units as amount, invoicelist.newprice, invoicelist.purchaseprice,
					invoicelist.newprod, invoicelist.sku, invoicelist.pieceprice,
					products_temp.code, products_temp.name, coalesce(split_part(invoicelist.prodchanges, ',', 8)::boolean,products_temp.piece) as piece,
					coalesce(split_part(invoicelist.prodchanges, ',', 9)::integer,products_temp.pieceinpack) as pieceinpack,
					categories.name as category_name, categories.id as category_id,
					null as category_name_new,null as category_id_new,
					brands.brand as brand_name,brands.id as brqand_id,
					null as brand_name_new,null as brand_id_new,
					null as units_name_new,null as units_id_new,
					CASE WHEN products_temp.id is null THEN false ELSE true END as is_new,
					product_static_prices.price as staticprice,
					invoicelist.hotkey,
					array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company),', ') as attributesCaption,
					invoicelist.attributes_json::text as attrs_json               
					,invoicelist.numpor,
					-- 01.03.2023
					invoicelist.updateallprodprice,
					invoicelist.wholesale_price,
					products_temp.unitsprid,
					u.name as unitspr_name,
					u.shortname 
					-- 01.03.2023

					-- 09.03.2023
					,coalesce(invoicelist.detales,0) as details
					,coalesce(invoicelist.detales_json::text,'[]') as details_json
					,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.detales and a.company = invoicelist.company),', ') as detailsCaption
					-- 09.03.2023
					
					-----23.05.2023
					/*
				,products_temp."attributes" as attributes_products
				,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = products_temp."attributes" and a.company = invoicelist.company),', ') as attributes_productsCaption
				,products_temp.details as details_products
				,array_to_string(array(select n.values||': '||coalesce(a.value,'') from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = products_temp.details and a.company = invoicelist.company),', ') as details_productsCaption
				   */
				-----23.05.2023

                 -------28.10.2025
                ,invoicelist.id as  invoicelist_id
				-------28.10.2025

	
					from invoices
						 inner join invoicelist on ( invoices.invoicenumber= invoicelist.invoice and invoices.company= invoicelist.company )
						 inner join products_temp on (products_temp.id=invoicelist.stock and products_temp.company= invoicelist.company )
						 inner join categories on products_temp.category= categories.id
						 inner join brands on brands.id= products_temp.brand
						 left Join  product_static_prices on (
						 products_temp.id= product_static_prices.product and
						 product_static_prices.company=products_temp.company
						 )
						 -- 01.03.2023
						 inner join unit_spr u
						 on u.id = products_temp.unitsprid
						 -- 01.03.2023
					where invoices.company= '${req.userData.company}' and invoices.invoicenumber='${req.query.invoicenumber}'
	
	) t1 order by numpor desc
					
	   
	`)
	  .then((product) => {
		console.log(product.rows);
		return res.status(200).json(product.rows);
	  })
	  .catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	  })
	
	});
	 ///07.09.2022


router.get('/product', (req, res) => {
	//console.log(req);


  
	
    
         knex('invoices')
		.join('invoicelist', { 'invoices.invoicenumber': 'invoicelist.invoice', 'invoices.company': 'invoicelist.company' })
		.join('products', { 'products.id': 'invoicelist.stock', 'products.company': 'invoicelist.company' })
		.join('categories', { 'products.category': 'categories.id'/*, 'products.company': 'categories.company'*/ })
		.leftJoin('categories as c', function() {
			this.on(knex.raw(`split_part(invoicelist.prodchanges, ',', 1)::integer`), '=', 'c.id').andOn('c.company', '=', 'invoicelist.company')
		})
		.join('brands', 'brands.id', 'products.brand')
		.leftJoin('brands as b', knex.raw(`split_part(invoicelist.prodchanges, ',', 4)::integer`),'b.id' )
		.leftJoin('unit_spr as u',knex.raw(`split_part(invoicelist.prodchanges, ',', 6)::integer`),'u.id')
		.leftJoin("product_static_prices", {
			"products.id": "product_static_prices.product",
			"product_static_prices.company": "products.company",
		  })
		.select('invoicelist.invoice', 'invoicelist.stock', 'invoicelist.attributes',
			'invoicelist.units as amount', 'invoicelist.newprice', 'invoicelist.purchaseprice',
			'invoicelist.newprod', 'invoicelist.sku', 'invoicelist.pieceprice',
			'products.code', 'products.name', knex.raw(`coalesce(split_part(invoicelist.prodchanges, ',', 8)::boolean,products.piece) as piece`), knex.raw(`coalesce(split_part(invoicelist.prodchanges, ',', 9)::integer,products.pieceinpack) as pieceinpack`),
			'categories.name as category_name', 'categories.id as category_id',
			'c.name as category_name_new','c.id as category_id_new',
			'brands.brand as brand_name','brands.id as brand_id',
			'b.brand as brand_name_new','b.id as brand_id_new',
			'u.name as units_name_new','u.id as units_id_new',
			knex.raw(`CASE WHEN products.id is null THEN true ELSE false END as is_new`),
			"product_static_prices.price as staticprice",
			'invoicelist.hotkey',
			//knex.raw("coalesce(split_part(invoicelist.prodchanges, ',', 0)::integer) as cat"),
			knex.raw("array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company),', ') as attributesCaption"),
			knex.raw("invoicelist.attributes_json::text as attrs_json")

                       ///07.09.2022 
                       ,'invoicelist.numpor'
                       ///07.09.2022

                )
               
                
               

		.where({ 'invoices.company': req.userData.company, 'invoices.invoicenumber': req.query.invoicenumber })
                 ///07.09.2022
                //.orderBy('numpor', 'desc')
                //.orderBy('invoicelist.numpor')

                ///07.09.2022
		.union(function () {
			this.select('invoicelist.invoice', 'invoicelist.stock', 'invoicelist.attributes',
				'invoicelist.units as amount', 'invoicelist.newprice', 'invoicelist.purchaseprice',
				'invoicelist.newprod', 'invoicelist.sku', 'invoicelist.pieceprice',
				'products_temp.code', 'products_temp.name', knex.raw(`coalesce(split_part(invoicelist.prodchanges, ',', 8)::boolean,products_temp.piece) as piece`), knex.raw(`coalesce(split_part(invoicelist.prodchanges, ',', 9)::integer,products_temp.pieceinpack) as pieceinpack`),
				'categories.name as category_name', 'categories.id as category_id',
				knex.raw('null as category_name_new'),knex.raw('null as category_id_new'),
				'brands.brand as brand_name','brands.id as brand_id',
				knex.raw('null as brand_name_new'),knex.raw('null as brand_id_new'),
				knex.raw('null as units_name_new'),knex.raw('null as units_id_new'),
				knex.raw(`CASE WHEN products_temp.id is null THEN false ELSE true END as is_new`),
				"product_static_prices.price as staticprice",
				//knex.raw("coalesce(split_part(invoicelist.prodchanges, ',', 0)::integer) as cat"),
				'invoicelist.hotkey',
				//knex.raw("array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company),', ') as attributesCaption")
				knex.raw("array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company),', ') as attributesCaption"),
				knex.raw("invoicelist.attributes_json::text as attrs_json")
               
                ,'invoicelist.numpor'
                

		)
				.from('invoices')
				.join('invoicelist', { 'invoices.invoicenumber': 'invoicelist.invoice', 'invoices.company': 'invoicelist.company' })
				.join('products_temp', { 'products_temp.id': 'invoicelist.stock', 'products_temp.company': 'invoicelist.company' })
				.join('categories', { 'products_temp.category': 'categories.id' })
				.join('brands', { 'brands.id': 'products_temp.brand' })
				.leftJoin("product_static_prices", {
					"products_temp.id": "product_static_prices.product",
					"product_static_prices.company": "products_temp.company",
				  })
				.where({ 'invoices.company': req.userData.company, 'invoices.invoicenumber': req.query.invoicenumber })
                 ///07.09.2022
                //.orderBy('numpor', 'desc')
                //.orderBy('invoicelist.numpor')

                ///07.09.2022

                
		})


		.then(invoices => {
			return res.status(200).json(invoices);
		}).catch((err) => {
			return res.status(500).json(err);
		});


/*
.then((product) => {
    console.log(product.rows[0]);
    return res.status(200).json(product.rows[0]);
  })
  .catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  })

*/
});

router.get('/stockcurrent/product', (req, res) => {
	knex('invoices')
		.join('invoicelist', { 'invoices.invoicenumber': 'invoicelist.invoice', 'invoices.company': 'invoicelist.company' })
		.join('stockcurrent', { 'stockcurrent.id': 'invoicelist.stock', 'stockcurrent.company': 'invoicelist.company' })
		.join('products', { 'products.id': 'stockcurrent.product', 'products.company': 'stockcurrent.company' })
		.select('invoicelist.invoice', 'invoicelist.stock', 'invoicelist.attributes',
			'invoicelist.units as amount', 'invoicelist.newprod',
			'products.code', 'products.name', 'products.id', 'invoicelist.comments as reason','invoicelist.newprice as price', 'invoicelist.wholesale_price',
			knex.raw(`coalesce(invoicelist.newprice*invoicelist.units,0) as total_price`))
		.where({ 'invoices.company': req.userData.company, 'invoices.invoicenumber': req.query.invoicenumber })
		.then(invoices => {
			return res.status(200).json(invoices);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

/////////07.06.2023


router.get('/product/details', (req, res) => {
	
	const invoicenumber = req.query.invoiceNumber;
	const productid 	= req.query.productId;
	const company 		= req.userData.company;

//////11.07.2023
  /*
	const attrview = knex("attrlist")
    .innerJoin("attributenames",{"attributenames.id":"attrlist.attribute"})
    .select(
      knex.raw(`
      jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
      'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
      'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS attributesCaption`),
      "attrlist.listcode"
	  )
	 .groupBy("attrlist.listcode")
	 .as("attrviewtable"); 
	
	 //09.03.2023
	 const detailview = knex("attrlist")
	 .innerJoin("attributenames",{"attributenames.id":"attrlist.attribute"})
	 .select(
	   knex.raw(`
	   jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
	   'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
	   'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS detailsCaption`),
	   "attrlist.listcode"
	   )
	  .groupBy("attrlist.listcode")
	  .as("detailviewtable"); 
	//09.03.2023
	
	//24.05.2023
	
	const attrviewproduct = knex('invoices')
	.leftJoin('invoicelist', { 'invoicelist.invoice': 'invoices.invoicenumber', 'invoicelist.company': 'invoices.company' })
	.leftJoin('products_temp', { 'products_temp.id': 'invoicelist.stock', 'products_temp.company': 'invoicelist.company' })
	.leftJoin('products', { 'products.id': 'invoicelist.stock', 'products.company': 'invoicelist.company' })
	
	.leftJoin('attrlist as a1',function () {this.on({ 'a1.listcode': 'products.attributes' }).orOn({ 'a1.listcode': 'products_temp.attributes' })})
    .leftJoin('attributenames as attr1',{'attr1.id':'a1.attribute'})
	.leftJoin('attrlist as a2',function () {this.on({ 'a2.listcode': 'products.details' }).orOn({ 'a2.listcode': 'products_temp.details' })})
	.leftJoin('attributenames as attr2',{'attr2.id':'a2.attribute'})
		
    .select(
      knex.raw(`
      jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 
      'attribute_name', attr1.values, 'attribute_value', a1.value,
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format)) AS attributesCaption`),
      "a1.listcode as attrlistcode",
	  
	  knex.raw(`
	  jsonb_agg(jsonb_build_object('attribute_id',a2.attribute, 
      'attribute_name', attr2.values, 'attribute_value', a2.value,
      'attribute_listcode', a2.listcode, 'attribute_format', attr2.format)) AS detailsCaption`),
      "a2.listcode as detaillistcode",
	  
	  "invoices.invoicenumber"
	  )
	 .where({ 'invoices.invoicenumber': invoicenumber, 'invoicelist.stock': productid, 'invoicelist.company': company })
	 .groupBy("a1.listcode","a2.listcode", "invoices.invoicenumber")
	 .as("attrviewproducttable"); 
	
    	
	
	
	//24.05.2023
	 
	const cost = knex('stockcurrent_part as sp')
		.select(knex.raw(`min(sp.purchaseprice) as purchaseprice`), 'sp.company', 'sp.point', 'sp.product', 'sp.attributes')
		.where({'sp.date': knex('stockcurrent_part as sp2')
								.min('sp2.date')
								.andWhereRaw('sp2.company = sp.company')
								.andWhereRaw('sp2.point = sp.point')
								.andWhereRaw('sp2.product = sp.product')
								.andWhereRaw('sp2.attributes = sp.attributes')
								.andWhere('sp2.units', '>', 0)
		})
		.andWhere('sp.units', '>', 0)
		.andWhere('sp.company', '=', company)
		.groupBy('sp.company','sp.point','sp.product','sp.attributes')
		.as('co'); 
	
	knex('invoices')
		.leftJoin('invoicelist', { 'invoicelist.invoice': 'invoices.invoicenumber', 'invoicelist.company': 'invoices.company' })
		.leftJoin('products_temp', { 'products_temp.id': 'invoicelist.stock', 'products_temp.company': 'invoicelist.company' })
		.leftJoin('products', { 'products.id': 'invoicelist.stock', 'products.company': 'invoicelist.company' })

                /////08.09.2022
                .leftJoin('unit_spr', function () {this.on({ 'unit_spr.id': 'products.unitsprid' }).orOn({ 'unit_spr.id': 'products_temp.unitsprid' })})
                /////08.09.2022   
		             

		.leftJoin('categories', function () {this.on({ 'categories.id': 'products.category' }).orOn({ 'categories.id': 'products_temp.category' })})
		.leftJoin('brands', function () {this.on({ 'brands.id': 'products.brand' }).orOn({ 'brands.id': 'products_temp.brand' })})
		.leftJoin(cost, { 'co.company': 'invoices.company', 'co.point': 'invoices.stockto', 'co.product': 'invoicelist.stock', 'co.attributes': 'invoicelist.attributes' })	
		.leftJoin(attrview, { "attrviewtable.listcode": "invoicelist.attributes" })
		// 09.03.2023
		.leftJoin(detailview,{"detailviewtable.listcode": "invoicelist.detales"}) 
		// 09.03.2023
		
		//24.05.2023
		//.leftJoin(attrviewproduct , function () {this.on({ 'attrviewproducttable.listcode': 'products.attributes' }).orOn({ 'attrviewproducttable.listcode': 'products_temp.attributes' })})
		//.leftJoin(detailviewproduct, function () {this.on({ 'detailviewproducttable.listcode': 'products.details' }).orOn({ 'detailviewproducttable.listcode': 'products_temp.details' })})
		.leftJoin(attrviewproduct , {'attrviewproducttable.invoicenumber': 'invoices.invoicenumber'}) 
		//24.05.2023
		
		.select('brands.brand', 'brands.id as brandid', 'categories.id as categoryid', 'categories.name as category', 
		'invoicelist.newprice','invoicelist.wholesale_price',
			knex.raw('coalesce(co.purchaseprice,invoicelist.purchaseprice) as purchaseprice'),
			knex.raw('coalesce(products.code,products_temp.code) as code'), 
			knex.raw('coalesce(products.name,products_temp.name) as name'),
			knex.raw('coalesce(products.cnofeacode, products_temp.cnofeacode) as cnofeacode'),	
			knex.raw('coalesce(products.id, products_temp.id) as id'), 
			knex.raw("coalesce(split_part(invoicelist.prodchanges, ',', 2)::integer,products.taxid, products_temp.taxid) as taxid"),
			knex.raw('coalesce(products.bonusrate, products_temp.bonusrate) as bonusrate'),
			knex.raw('coalesce(invoicelist.updateallprodprice,true) as updateallprodprice'),
			knex.raw('coalesce(coalesce(products.unitsprid,products_temp.unitsprid),1) as unitsprid'),
			knex.raw("(case when attrviewtable.attributesCaption is null then '[]'::jsonb else attrviewtable.attributesCaption end) as attributescaption"),
			knex.raw("array(select a.attribute||'|'||a.value||'|'||a.listcode||'|'||n.values from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = invoicelist.attributes and a.company = invoicelist.company) as attributesArray"),
			'invoicelist.attributes'

                /////08.09.2022
                ,'unit_spr.name as unitspr_name'
                /////08.09.2022
			//09.03.2023
			,knex.raw("invoicelist.detales as details")
			,knex.raw("invoicelist.detales_json as details_json")
			,knex.raw("(case when detailviewtable.detailsCaption is null then '[]'::jsonb else detailviewtable.detailsCaption end) as detailsCaption"),
			//09.03.2023
			
			//24.05.2023
			//knex.raw("(case when attrviewproducttable.attributesCaption is null then '[]'::jsonb else attrviewproducttable.attributesCaption end) as attributesproductcaption")
			//,knex.raw("(case when detailviewproducttable.detailsCaption is null then '[]'::jsonb else detailviewproducttable.detailsCaption end) as detailsproductCaption")			
			knex.raw("(case when attrviewproducttable.attributesCaption is null then '[]'::jsonb else attrviewproducttable.attributesCaption end) as attributesproductcaption")
			,knex.raw("(case when attrviewproducttable.detailsCaption is null then '[]'::jsonb else attrviewproducttable.detailsCaption end) as detailsproductCaption")			
			
			//24.05.2023
			*/
knex.raw(`
	select 

brands.brand, brands.id as brandid, categories.id as categoryid, categories.name as category, 
invoicelist.newprice,invoicelist.wholesale_price,
coalesce(co.purchaseprice,invoicelist.purchaseprice) as purchaseprice,
coalesce(products.code,products_temp.code) as code, 
coalesce(products.name,products_temp.name) as name,
coalesce(products.cnofeacode, products_temp.cnofeacode) as cnofeacode,	
coalesce(products.id, products_temp.id) as id, 
coalesce(split_part(invoicelist.prodchanges, ',', 2)::integer,products.taxid, products_temp.taxid) as taxid,
coalesce(products.bonusrate, products_temp.bonusrate) as bonusrate,
coalesce(invoicelist.updateallprodprice,true) as updateallprodprice,
coalesce(coalesce(products.unitsprid,products_temp.unitsprid),1) as unitsprid,
--(case when attrviewtable.attributesCaption is null then '[]'::jsonb else attrviewtable.attributesCaption end) as attributescaption,
(case when 

(
select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=invoicelist.attributes))
)

is null then '[]'::jsonb else 

(
select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=invoicelist.attributes))
)

end) as attributescaption,
array(select a.attribute||'|'||a.value||'|'||a.listcode||'|'||n.values from attrlist a left join attributenames n on (n.id = a.attribute) 
where a.listcode = invoicelist.attributes and a.company = invoicelist.company) as attributesArray,

invoicelist.attributes,invoicelist.attributes_json as attrs_json,unit_spr.name as unitspr_name,
invoicelist.detales as details
,invoicelist.detales_json as details_json 
,(case when 

(
select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=invoicelist.detales))
)

is null then '[]'::jsonb else 

(
select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=invoicelist.detales))
)

end) as detailsCaption




,(case when (

select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=products.attributes or 
                       attrlist.listcode=products_temp.attributes))
                       
                       )  is null then '[]'::jsonb else (

select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=products.attributes or 
                       attrlist.listcode=products_temp.attributes))
                       
                       )  end) as attributesproductcaption
,(case when (

select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=products.details  or 
                       attrlist.listcode=products_temp.details))
                       
                       ) is null then '[]'::jsonb else (

select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute 
                       and (attrlist.listcode=products.details  or 
                       attrlist.listcode=products_temp.details))
                       
                       ) end) as detailsproductCaption				
			




from invoices left join invoicelist on (invoicelist.invoice= invoices.invoicenumber and  invoicelist.company=invoices.company )
                       left join products_temp on (products_temp.id= invoicelist.stock and products_temp.company=invoicelist.company)
                       left join products on (products.id=invoicelist.stock and products.company=invoicelist.company)
                       left join unit_spr on (unit_spr.id=products.unitsprid or unit_spr.id=products_temp.unitsprid)
                       left join categories on (categories.id=products.category or categories.id= products_temp.category )
                       left join brands on (brands.id= products.brand or brands.id= products_temp.brand)
                       left join 
                       (
                       select 
                       min(sp.purchaseprice) as purchaseprice, sp.company, sp.point, sp.product, sp.attributes
                       from stockcurrent_part as sp where 
                       sp.date in (select min(sp2.date) from stockcurrent_part as sp2
								where
								 sp2.company = sp.company
								 and sp2.point = sp.point
								 and sp2.product = sp.product
								 and sp2.attributes = sp.attributes
								 and sp2.units> 0
		               )
		               and sp.units> 0
		               and sp.company=2
		               group by sp.company,sp.point,sp.product,sp.attributes
                       )                       
                       as co on (co.company=invoices.company and co.point=invoices.stockto
                       and co.product=invoicelist.stock and co.attributes=invoicelist.attributes)	
                      /*
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS attributesCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       ) as attrviewtable                       
                       on (attrviewtable.listcode=invoicelist.attributes)
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS detailsCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       )  as   detailviewtable                   
                       on (detailviewtable.listcode=invoicelist.detales) 
                       */
                       
                       /*
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS attributesCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       )  as   attrviewproducttable                   
                       on (
                       attrviewproducttable.listcode=products.attributes 
                       --or 
                       --attrviewproducttable.listcode=products_temp.attributes
                       ) 
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS attributesCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       )  as   attrviewproducttablet                   
                       on (
                       
                       attrviewproducttablet.listcode=products_temp.attributes
                       ) 
                       
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS detailsCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       )  as   attrviewproducttabled                  
                       on (
                       attrviewproducttabled.listcode=products.details  
                       --or 
                       --attrviewproducttable.listcode=products_temp.attributes
                       ) 
                       left join 
                       (
                       select 
                       jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 
                       'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
                       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS detailsCaption,
                       attrlist.listcode 
                       from attrlist
                       inner join attributenames on (attributenames.id=attrlist.attribute)
                       group by attrlist.listcode
                       )  as   attrviewproducttabledt                   
                       on (
                       
                       attrviewproducttabledt.listcode=products_temp.details
                       ) 
                       */
                       
                       /*
                       where invoices.invoicenumber= invoicenumber and invoicelist.stock= productid
                       and invoicelist.company=company and invoicelist.attributes=attributes 
                       */
                       where invoices.invoicenumber= '${invoicenumber}' 
                       
                       and invoicelist.stock='${productid}'
                       and invoicelist.company='${company}'
`	
	)
		//.first()//временно
		//.where({ 'invoices.invoicenumber': invoicenumber, 'invoicelist.stock': productid, 'invoicelist.company': company })
	//////11.07.2023
	.then(result => {
		    //////01.08.2023
			//return res.status(200).json(result);
			//return res.status(200).json(result.rows[0]);
			return res.status(200).json(result.rows);
			//////01.08.2023
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

/////////07.06.2023

router.get('/newbarcode', (req, res) => {
	knex.raw("SELECT nextval('barcode_seq')").then(result => {
		return res.status(200).json(result.rows[0].nextval);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/create', (req, res) => {
	req.query.isweight = typeof req.query.isweight !== "undefined" && req.query.isweight !== null ? Boolean(req.query.isweight) : Boolean(false);
	req.body.user = req.userData.id;

	knex.raw('select invoice_create(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_create;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post("/add/product", (req, res) => {
  helpers.serverLog(req.originalUrl, req.body);
  req.body.user = req.userData.id;

  knex
    .raw("select invoice_addprod(?)", [req.body])
    .then(result => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
	  result = result.rows[0].invoice_addprod;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch(err => {
      return res.status(500).json(err);
    });
});

router.post("/add/product/attributes", (req, res) => {
	helpers.serverLog(req.originalUrl, req.body);
	req.body.user = req.userData.id;
  
	knex
	  .raw("select redis(?)", [req.body])
	  .then(result => {
		helpers.log(req.body, result, result.fields[0].name, req.ip);
		return res.status(result.code == "success" ? 200 : 500).json(result);
	  })
	  .catch(err => {
		return res.status(500).json(err);
	  });
  });



router.post('/delete/product', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select invoice_delprod(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_delprod;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/update/product', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select invoice_updateprod(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_delprod;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/submit/add', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select goods_add(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].goods_add;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/submit/writeoff', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select goods_writeoff(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].goods_writeoff;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/submit/movement', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select goods_movement(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].goods_movement;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/submit/movement/list', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select invoice_list_movement(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_list_movement;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/delete', (req, res) => {
	req.body.user    = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select invoice_del(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_del;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/changeprice', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select goods_sellprice_change(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].goods_sellprice_change;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

//сервис для массового изменения предельных цен
router.post('/changestaticprice', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select goods_staticprice_change(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].goods_staticprice_change;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.get('/checkpurchaseprice', (req, res) => {
	
		const point 		= req.query.point;
		const product 		= req.query.product;
		const attributes 	= req.query.attributes;
		const company 		= req.userData.company;
		const price 		= req.query.price;
		const error = JSON.parse('{ "code":"insufficient_parameters"}');
		
		//return res.status(200).json(typeof(price));
		if (!point || !product || !attributes || !company || !price) return res.status(200).json(error);
	
		knex('stockcurrent_part')
			.select(knex.raw(`max(purchaseprice) as purchaseprice, to_char(min(date),'DD.MM.YYYY') as date`))
			.where({ 'stockcurrent_part.point': point, 'stockcurrent_part.product': product, 'stockcurrent_part.attributes': attributes, 'stockcurrent_part.company': company })
			.andWhere('units', '>', 0)
			.andWhere('purchaseprice', '>=', price)
			.first()
			.then(stockcurrent_part => {
				if (stockcurrent_part.purchaseprice === null) {
					stockcurrent_part.code = 'not_found';
				} else {
					stockcurrent_part.code = 'found';
				} 		
				stockcurrent_part.purchaseprice = stockcurrent_part.purchaseprice;
				return res.status(200).json(stockcurrent_part);
			}).catch((err) => {
				console.log(err)
				return res.status(500).json(err);
			});
});

router.post("/products/add",(req,res)=>{
	req.body.user = req.userData.id;
	knex.raw('select invoice_product_add(?)',[req.body])
	.then(result => {
		result = result.rows[0].invoice_product_add;
		return res.status(result.code == "success" ? 200 : 500).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

////31.08.2022
router.post("/functioncall",(req,res)=>{
	
	//////09.10.2023
	/*
	req.body.user = req.userData.id;
	
	///////12.05.2023
	const company = req.userData.company ? req.userData.company : 0; 
	req.body.company = company;
	///////12.05.2023
	*/
	req.body.company = typeof req.body.company !== "undefined" && req.body.company !== null ? req.body.company : req.userData.company;
	req.body.user = typeof req.body.user !== "undefined" && req.body.user !== null ? req.body.user : req.userData.id;
	//////09.10.2023 
	
        //knex.raw('select invoice_create_isp(?)',[req.body])        
	//knex.raw('select invoice_create_vusov(?)',[req.body])
        knex.raw('select functioncalls.create_function_call(?)',[req.body])

	.then(result => {
		//result = result.rows[0].invoice_create_isp;
                //result = result.rows[0].invoice_create_vusov;
                result = result.rows[0].create_function_call;
		return res.status(result.code == "success" ? 200 : 500).json(result);
	}).catch((err) => {
                 console.log(err);
		return res.status(500).json(err);
	});
});
////31.08.2022

// 23.12.2022
router.delete('/delete/many', (req,res) => {

	const company = req.userData.company ? req.userData.company : 0; 
	req.body.company = company;
	//req.body.forEach(el => el.company = company)

	knex.raw("select invoice_delete(?)",[req.body]).
	then(result =>{
		result = result.rows[0].invoice_delete;
		return res.status(result.code == 'success' ? 200 : 500).json(result);
	}).catch((err) => {
		console.log(req)
		console.log(err)
		return res.status(500).json(err);
	})

});
// 23.12.2022

// 23.12.2022
router.patch('/edit',(req, res) => {

	//const company = req.userData.company ? req.userData.company : 0;
	req.body.company = req.userData.company ? req.userData.company : 0;

	knex.raw("select invoice_edit(?)",[req.body]).
	then(result => {
		result = result.rows[0].invoice_edit;
		return res.status(result.code == "success" ? 200: 500).json(result)
	}).catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	})
});
// 23.12.2022

module.exports = router;