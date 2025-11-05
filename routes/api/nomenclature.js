const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get("/", (req, res) => {

  const company = req.userData.company;
 const name = req.query.name;
 const barcode = req.query.barcode;
 knex.raw(`

select
       "attributes", "brand",  brandid,  category,  categoryid,
       "cnofeacode", "code", "details", "id", "name", "piece", "pieceinpack",
       "taxid", "unitsprid",  unitspr_name,  unitspr_shortname,
       attributescaption,
       (case when detailscaption is null then '[]'::jsonb else detailscaption end) as detailscaption
       ,(case when bar is null then '[]'::jsonb else bar end) as bar
       from
       (
       select "products"."attributes", "brands"."brand", products.brand as brandid, categories.name as category, products.category as categoryid,
       "products"."cnofeacode", "products"."code", "products"."details", "products"."id", "products"."name", "products"."piece", "products"."pieceinpack",
       "products"."taxid", "products"."unitsprid", unit_spr.name as unitspr_name, unit_spr.shortname as unitspr_shortname
       ,(select jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS attributesCaption
         from "attrlist"
       inner join "attributenames" on ("attributenames"."id" = "attrlist"."attribute" and "products"."attributes" = "attrlist"."listcode")
       group by "attrlist"."listcode") as attributescaption
       ,(select jsonb_agg(jsonb_build_object('attribute_id',attrlist.attribute, 'attribute_name', attributenames.values, 'attribute_value', attrlist.value,
       'attribute_listcode', attrlist.listcode, 'attribute_format', attributenames.format)) AS detailsCaption
         from "attrlist"
       inner join "attributenames" on ("attributenames"."id" = "attrlist"."attribute" and "attrlist"."listcode" = "products"."details")
       group by "attrlist"."listcode") as detailscaption
       ,(select
         jsonb_agg(barcode) as bar
         from "products_barcode"
         where "product" =
             (select "product" from "products_barcode", "products"
             where "products_barcode"."product" = "products"."id"
             and "products_barcode"."barcode" = '${barcode}' and "products_barcode"."company" = '${company}'
             and "products"."deleted" = 'f')
        )
       from
       "products_barcode"
       inner join
       "products" on "products"."id" = "products_barcode"."product" and "products"."company" = "products_barcode"."company"
       left join "brands" on "brands"."id" = "products"."brand"
       left join "categories" on "categories"."id" = "products"."category"
       left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid"
       where
       products_barcode.barcode = '${barcode}' and "products_barcode"."company" = '${company}' and "products"."deleted" = 'f'
       )
       t1


`).then((products) => {
   let temp = [];
   temp.push(products.rows[0]);
   //return res.status(200).json(temp);
   return res.status(200).json(products.rows[0]);
 })
   .catch((err) => {
     console.log(err);
     return res.status(500).json(err);
   });
 
});


router.get("/spr", (req, res) => {
  const barcode = req.query.barcode;
  knex.raw(`select 0 as attributes,
    null as attributescaption,
    'Без бренда' as brand,
    brandid,
    '' as category,
    0 as categoryid,
    0 as cnofeacode,
    code,
    0 as details,
    '[]'::json as detailscaption, 
    0 as id,
    name,
    false as piece,
    0 as pieceinpack,
    0 as taxid, 
    1 as unitsprid,
    '' as unitspr_name,
    '' as  unitspr_shortname
    from products_spr
    where code = '${barcode}'
    limit 1`).then((products) => {
    let temp = [];
    temp.push(products.rows[0]);
    //return res.status(200).json(temp);
    return res.status(200).json(products.rows[0]);
  })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/products_spr", (req, res) => {
  const name = req.query.name;
  knex.raw(`SELECT
	products."name",
	products.code 
FROM
	"public".products 
WHERE
products."name" ILIKE'%${name}%'
AND products.company = ${req.userData.company}
AND products.deleted = FALSE
ORDER BY products."name" ASC
  LIMIT 30`).then((products) => {
    return res.status(200).json(products.rows);
  })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/invoicen1", (req, res) => {
  const company = req.query.company ? req.query.company : req.userData.company;

  // Формируем фильтры из query
  const categoryFilter = req.query.category
    ? `and p.category in (${req.query.category.map(c => `${c}`).join(",")})`
    : "";

  const brandFilter = req.query.brand ? `and p.brand = '${req.query.brand}'` : "";
  const nameFilter = req.query.name ? `and p.name ilike '%${req.query.name}%'` : "";
  const barcodeFilter = req.query.barcode ? `and p.code = '${req.query.barcode}'` : "";

  const itemsPerPage =
    typeof req.query.itemsPerPage !== "undefined" && req.query.itemsPerPage !== null
      ? req.query.itemsPerPage
      : 50;
  const pageNumber =
    typeof req.query.pageNumber !== "undefined" && req.query.pageNumber !== null
      ? req.query.pageNumber
      : 1;
  const offset = itemsPerPage * (pageNumber - 1);

  // Считаем общее количество
  knex.raw(`
    select count(*) as co
    from products p
    where p.company = ${company}
      and not p.deleted
      and p.category <> -1
      ${categoryFilter}
      ${brandFilter}
      ${nameFilter}
      ${barcodeFilter}
  `)
    .then(count => {
      const totalCount = count.rows[0].co;

      // Основной запрос с агрегацией через string_agg
      knex.raw(`
        select 
          p.id, 
          p.code, 
          p.name,
          b.id as brandid, 
          b.brand, 
          c.id as categoryid, 
          c.name as category, 

          string_agg(distinct n.values || ': ' || a.value, ', ') 
            filter (where a.listcode = p.attributes) as attributesCaption,

          string_agg(distinct n2.values || ': ' || d.value, ', ') 
            filter (where d.listcode = p.details) as detailsCaption,

          (p.attributes <> 0) as attributesExist,
          (p.details <> 0) as detailsExist,

          sm.mincount,
          sm.maxcount,
          sm.enabled

        from products p
        left join brands b on b.id = p.brand
        left join categories c on c.id = p.category
        left join attrlist a on a.listcode = p.attributes and a.company = p.company
        left join attributenames n on n.id = a.attribute
        left join attrlist d on d.listcode = p.details and d.company = p.company
        left join attributenames n2 on n2.id = d.attribute
        left join stock_minmax sm on sm.product = p.id

        where p.company = ${company}
          and not p.deleted
          and p.category <> -1
          ${categoryFilter}
          ${brandFilter}
          ${nameFilter}
          ${barcodeFilter}

        group by 
          p.id, p.code, p.name, 
          b.id, b.brand, 
          c.id, c.name, 
          sm.mincount, sm.maxcount, sm.enabled

        order by p.id desc
        limit ${itemsPerPage} offset ${offset}
      `)
        .then(result => {
          // Добавляем totalCount к каждому объекту результата
          result.rows.forEach(p => (p.totalcount = totalCount));
          return res.status(200).json(result.rows);
        })
        .catch(err => {
          console.error(err);
          return res.status(500).json({ error: "Ошибка при выполнении запроса" });
        });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: "Ошибка при подсчёте количества" });
    });
});


router.get("/invoice", (req, res) => {

	const company = req.query.company ? req.query.company : req.userData.company;
  const category = req.query.category ? `and p.category in (${req.query.category.map(c => `${c}`).join(",")})` : "";
  
  // 06.04.2023;
  const brand = req.query.brand ? `and p.brand = '${req.query.brand}'` : "";
  const name = req.query.name ? `and p.name ilike '%${req.query.name}%'` : "";
  const barcode = req.query.barcode ? `and p.code = '${req.query.barcode}'` : "";
  // 06.04.2023

  // 17.07.2023
  const point = req.query.point ? `  and sm.point = '${req.query.point}' ` : "";
  const p1=req.query.point ? ` ,sm.mincount,sm.maxcount,sm.enabled ` : "";
  // 17.07.2023

	const flag = req.query.flag ? req.query.flag : false;

  // 07.04.2023
  const hasAttribute = req.query.hasattributes ? Number(req.query.hasattributes) : -1;

  let attributes = "";
  if (hasAttribute === 1) {
    attributes = "and (p.attributes <> 0 or p.details <> 0)";
  } 
  else if (hasAttribute === 0) {
    attributes = "and (p.attributes = 0 and p.details = 0)";
  }
  // 07.04.2023

	const itemsPerPage =
  	typeof req.query.itemsPerPage !== "undefined" &&
  	req.query.itemsPerPage !== null
    ? req.query.itemsPerPage
    : "50";

  const pageNumber =
    typeof req.query.pageNumber !== "undefined" && req.query.pageNumber !== null
    ? req.query.pageNumber
    : "1";

  const itemFrom = itemsPerPage * (pageNumber - 1);

  // 07.04.2023
  knex.raw(`
    select count(*) co
    from products p 
    where p.company = ${company}
    and not p.deleted
    and p.category <> -1
    ${category}
    ${brand}
    ${name}
    ${barcode}
    ${attributes}
  `)
  .then(count => {
    const totalCount = count.rows[0].co;
  // 07.04.2023
    knex.raw(
      `select 
	  distinct
	  p.id, p.code, p."name", 
      b.id as brandid, b.brand, 
      c.id as categoryid, c.name as category, 
      c.parentid, 
      coalesce(tabl.mainparent,0) mainparent, 
      coalesce(c2."name",'Без категории') as maincategory,
      coalesce(tabl.pathname,'Без категории') as pathname,

      p."attributes",
      array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p.attributes and a.company = p.company),', ') as attributesCaption,
 	    
      p.details,
       array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p.details and a.company = p.company),', ') as detailsCaption,
    
      case when p."attributes" <> 0 
      then true 
      else false 
      end as attributesExist,

      case when p.details <> 0 
      then true
      else false
      end as detailsExist
	  
	  -----17.07.2023
	  /*
	  ,sm.mincount,
      sm.maxcount,
      sm.enabled
	  */
	  
	  ${p1}
	  -----17.07.2023

      from products p
      
      left join brands b
      on b.id = p.brand
      
      left join categories c 
      on c.id = p.category 

      left join (
          with recursive rec (id, name, parentid, path, level, pathname)
        as (
        select id, name, parentid, cast(id as varchar) as path, 1, 
        cast(name as varchar) as pathname
        from categories 
        where company = ${company}
        and parentid = 0

        union 

        select c.id, lpad(' ',3*level) || c.name, c.parentid, 
        path || ', ' || cast(c.id as varchar), level+1, pathname || ', ' || cast(c.name as varchar)
        from categories c 
        inner join rec r
        on c.parentid = r.id
        where c.company = ${company}

        )
        select id, name, parentid, cast(split_part(path,',',1) as bigint) mainparent,
        pathname
        from rec

        order by id

        ) tabl
      
        on p.category = tabl.id
      
        left join categories c2
        on c2.id = tabl.mainparent


        -----17.07.2023
		--${point}
		
		left join stock_minmax sm on (sm.product=p.id ${point}
		 -- and sm.point=324
        --and sm.point=(case when ${req.query.point} is null then sm.point else ${req.query.point}  end)
        )
		
        /*
		left join stock_minmax sm on (sm.product=p.id 
        and sm.point=(case when ${req.query.point} is null then sm.point else ${req.query.point}  end)
        )
		*/
        -----17.07.2023 
      
        where p.company = ${company}
        and not p.deleted
        and p.category <> -1
        ${category}
        ${brand}
        ${name}
        ${barcode}
        ${attributes}

        order by p.id desc
        limit '${itemsPerPage}'
        offset '${itemFrom}'
        `
        )
	      .then(product => {
        product.rows.forEach(p => p.totalcount = totalCount);
        return res.status(200).json(product.rows);
        })
	      .catch(err => {
        console.log(err);
	      return res.status(500).json(err);
	      });
    })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })

});

///////20.07.2023

router.post("/stockminmax/product",(req,res) => {
  
  const company =  req.body.company ? req.body.company : req.userData.company;
  req.body.company = company;
  //req.body.user  = req.body.user ? req.body.user : req.userData.id;

 knex.raw(`select functioncalls.create_function_call(?)`,[req.body])
  .then(result => {
   // return res.status(200).json(result.rows[0].productspr_edit);
   
   const 
   stock1=result.rows[0].create_function_call;
   /*
   result.rows[0].create_function_call.stock.forEach((p) => {
	   p.pointname = helpers.decrypt(p.pointname);
   }
   */
   
    stock1.stock.forEach((p) => {
		
		///////04.08.2023
		p.pointname = helpers.decrypt(p.pointname);
		if (p.hasOwnProperty('stockname')) {
			
		if (p.stockname.toUpperCase() !== "ЦЕНТРАЛЬНЫЙ СКЛАД") {
          //Склад точки
          if (p.stockname.substring(0, 12).toUpperCase().trim() === "СКЛАД ТОЧКИ") {
            p.stockname = `Склад точки ${helpers.decrypt(p.stockname.substring(13))}`;
          } else {
            p.stockname = helpers.decrypt(p.stockname);
          }
        }
		
		}
		
		/*
	  if (p.pointname.toUpperCase() !== "ЦЕНТРАЛЬНЫЙ СКЛАД") {
          //Склад точки
          if (p.pointname.substring(0, 12).toUpperCase().trim() === "СКЛАД ТОЧКИ") {
            p.pointname = `Склад точки ${helpers.decrypt(p.pointname.substring(13))}`;
          } else {
            p.pointname = helpers.decrypt(p.pointname);
          }
        }
	   */
       ///////04.08.2023	   
		
   });
    
	return res.status(200).json(stock1.stock);
   
   //return res.status(200).json(result.rows[0].create_function_call);
   
  })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })


  
});

///////20.07.2023


///////17.07.2023

router.get("/stockminmax",(req,res) => {
  
  const company =  req.body.company ? req.query.company : req.userData.company;
  //req.body.user  = req.body.user ? req.body.user : req.userData.id;

  knex.raw(`
  
  select p."name" as point,code,p2.name as product,s2.units,p3.name as stockname
,b.brand,c.name as category
, p2."attributes",
      array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p2.attributes and a.company = p2.company),', ') as attributesCaption,
 	    
      p2.details,
       array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p2.details and a.company = p2.company),', ') as detailsCaption
 ,s.mincount   
from public.points p inner join public.stock_minmax s on (p.id=s.point)
                       inner join public.products p2 on (s.product=p2.id)
                       left join public.stockcurrent s2 on ( p.company=s2.company and s.product=s2.product)
                       left join public.points p3 on (p3.id=s2.point)
                       left join brands b on b.id = p2.brand      
                       left join categories c on c.id = p2.category 
where p.company=${company} and s2.point in (SELECT max(s.stock) 
	        FROM points p1
		        LEFT JOIN pointset s on (s.point = p1.id)
		                 WHERE p1.id=p.id) 
		          and p.status = 'ACTIVE'
		         and s2.units <s.mincount	and s.enabled =true          
  
  `)
  .then(product => {
        product.rows.forEach((p) => {
			
        p.point = helpers.decrypt(p.point);
		if (p.stockname.toUpperCase() !== "ЦЕНТРАЛЬНЫЙ СКЛАД") {
          //Склад точки
          if (p.stockname.substring(0, 12).toUpperCase().trim() === "СКЛАД ТОЧКИ") {
            p.stockname = `Склад точки ${helpers.decrypt(p.stockname.substring(13))}`;
          } else {
            p.stockname = helpers.decrypt(p.stockname);
          }
        }
		//p.stockname = helpers.decrypt(p.stockname);
        
      }
		);
        return res.status(200).json(product.rows);
  })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })
});

//////17.07.2023



router.put("/multiple/edit",(req,res) => {
  
  req.body.company =  req.body.company ? req.body.company : req.userData.company;
  req.body.user  = req.body.user ? req.body.user : req.userData.id;

  knex.raw(`select public.productspr_edit(?)`,[req.body])
  .then(result => {
    return res.status(200).json(result.rows[0].productspr_edit);
  })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })
});

router.put("/multiple/delete",(req,res) => {

  req.body.company =  req.body.company ? req.body.company : req.userData.company;
  req.body.user  = req.body.user ? req.body.user : req.userData.id;

  knex.raw(`select public.productspr_delete_multiple(?)`,[req.body])
  .then(result => {
    return res.status(200).json(result.rows[0].productspr_delete_multiple);
  })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })
});

router.get("/invoice/weight", (req, res) => {

	const company = req.query.company ? req.query.company : req.userData.company;
  const brand = req.query.brand ? `and p.brand = '${req.query.brand}'` : "";
  const name = req.query.name ? `and p.name ilike '%${req.query.name}%'` : "";
  const barcode = req.query.barcode ? `and p.code = '${req.query.barcode}'` : "";
  const hasAttribute = req.query.hasattributes ? Number(req.query.hasattributes) : -1;

  let attributes = "";
  if (hasAttribute === 1) {
    attributes = "and (p.attributes <> 0 or p.details <> 0)";
  } 
  else if (hasAttribute === 0) {
    attributes = "and (p.attributes = 0 and p.details = 0)";
  }

  knex.raw(
    `
    select p.id, p.code, p."name", 
    b.id as brandid, b.brand, 
    c.id as categoryid, c.name as category, 
    p."attributes",
    array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p.attributes and a.company = p.company),', ') as attributesCaption,
    p.details,
    array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = p.details and a.company = p.company),', ') as detailsCaption
    

from products p
      
      left join brands b
      on b.id = p.brand
      
      left join categories c 
      on c.id = p.category 
            
      where p.company = ${company}
      and not p.deleted
      and p.category = -1
      ${brand}
      ${name}
      ${barcode}
      ${attributes} 
      order by p.id desc 
    `
      )
	.then(product => {
    return res.status(200).json(product.rows);

  })
	.catch(err => {
    console.log("Error!!!");
    console.log(err);
	  return res.status(500).json(err);
	});

});


module.exports = router;
