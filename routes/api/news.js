const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

//create news. Only admin
router.post("/", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select add_news(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0]);
      return res
        .status(result.rows[0].add_news.code == "success" ? 200 : 400)
        .json(result.rows[0].add_news.text);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//update news. Only admin
router.post("/update_news", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select update_news(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].update_news.code == "success" ? 200 : 400)
        .json(result.rows[0].update_news.text);
    })
    .catch((err) => {
      helpers.log("Undasta err!", err);
      return res.status(500).json(err);
    });
});

//delete news. Only admin.
router.post("/delete_news", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select delete_news(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].delete_news.code == "success" ? 200 : 400)
        .json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//view current news that available for users
router.get("/current", (req, res) => {
  knex("news_diary")
    .innerJoin("news", {
      "news_diary.news_id": "news.id",
    })
    .innerJoin("erp_users", {
      "news_diary.user_id": "erp_users.id",
    })
    .select(
      "news.id as id",
      "news.date as date",
      "news.category as category",
      "news.header as header"
    )
    .where({
      "news_diary.flag": true,
      "news_diary.user_id": req.userData.id,
    })
    .orderBy("date", "desc")
    .then((news) => {
      return res.status(200).json(news);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//delete news for current user. ex =>  {("news_id":30)}
router.post("/delete_flag", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select del_flag_news(?)", [req.body])
    .then((result) => {
      helpers.serverLog(
        req.body,
        result.rows[0],
        result.fields[0].name,
        req.ip
      );
      result = result.rows[0].del_flag_news;
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});
//get all news to display in customer news section
router.get("/all", (req, res) => {
  knex("news")
    .select(
      "news.id as id",
      "news.date as date",
      "news.category as category",
      "news.header as header"
    )
    .orderBy("date", "desc")
    .then((news) => {
      return res.status(200).json(news);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//get news by id
router.get("/byId", (req, res) => {
  knex("news")
    .select(
      "news.id as id",
      "news.date as date",
      "news.category as category",
      "news.header as header",
      "news.content as content"
    )
    .where({
      "news.id": req.query.id,
    })
    .then((news) => {
      return res.status(200).json(news);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

module.exports = router;
