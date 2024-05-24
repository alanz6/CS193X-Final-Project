import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

/* Be sure to use DATABASE_NAME in your call to .db(), so we can change the constant while grading. */
let DATABASE_NAME = "cs193x_project";

/* Do not modify or remove this line. It allows us to change the database for grading */
if (process.env.DATABASE_NAME) DATABASE_NAME = process.env.DATABASE_NAME;

let api = express.Router();
let Users;
let Posts;

const initApi = async (app) => {
  app.set("json spaces", 2);
  app.use("/api", api);

  let conn = await MongoClient.connect("mongodb://127.0.0.1");
  let db = conn.db(DATABASE_NAME);
  Users = db.collection("users");
  Posts = db.collection("posts");
};

api.use(bodyParser.json());
api.use(cors());

api.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

/*** Test routes ***/

api.get("/tests/get", (req, res) => {
  let value = req.query.value || null;
  res.json({ success: true, value });
});

api.post("/tests/post", (req, res) => {
  let value = req.body.value || null;
  res.json({ success: true, value });
});

api.get("/tests/error", (req, res) => {
  res.status(499).json({ error: "Test error" });
});

api.all("/tests/echo", (req, res) => {
  res.json({
    method: req.method,
    query: req.query,
    body: req.body
  });
});

/*** Generic Social Media API ***/

api.get("/users", async (req, res) => {
  let users = await Users.find().toArray();
  let ids = [];
  for (let user of users) {
    ids.push(user.id);
  }
  res.json({ "users": ids });
});

api.post("/users", async (req, res) => {
  let id = req.body.id;
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }
  let user = await Users.findOne({ id: id });
  if (user) {
    res.status(400).json({ error: id + " already exists" });
    return;
  }
  await Users.insertOne({ id: id, name: id, avatarURL: "images/default.png", following: [] });
  res.json({ id: id, name: id, avatarURL: "images/default.png", following: [] });
});

api.use("/users/:id", async (req, res, next) => {
  let id = req.params.id;
  let user = await Users.findOne({ id: id });
  if (!user) {
    res.status(404).json({ error: "No user with ID " +  id});
    return;
  }
  res.locals.user = user;
  next();
})

api.get("/users/:id", async (req, res) => {
  let user = res.locals.user;
  delete user._id;
  res.json({ id: user.id, name: user.name, avatarURL: user.avatarURL, following: user.following });
});

api.patch("/users/:id", async (req, res) => {
  let user = res.locals.user;
  let name = req.body.name;
  let avatarURL = req.body.avatarURL;
  if (name === "") {
    user.name = user.id;
  } else if (name) {
    user.name = name;
  }

  if (avatarURL === "") {
    user.avatarURL = "images/default.png";
  } else if (avatarURL) {
    user.avatarURL = avatarURL;
  }
  await Users.replaceOne({ id: user.id }, user);
  res.json({ id: user.id, name: user.name, avatarURL: user.avatarURL, following: user.following });
});

api.get("/users/:id/feed", async (req, res) => {
  let user = res.locals.user;
  delete user._id;
  let posts = [];
  for (let u of user.following) {
    console.log(u);
    let cur_posts = await Posts.find({ userId: u }).toArray();
    posts = posts.concat(cur_posts);
  }
  let cur_posts = await Posts.find({ userId: user.id }).toArray();
  posts = posts.concat(cur_posts);
  posts.sort((a, b) => b.time - a.time);

  delete user.following;
  let feed = [];
  for (let post of posts){
    let post_owner = await Users.findOne({ id: post.userId });
    delete post_owner._id;
    delete post_owner.following;
    feed.push({user: post_owner, time: post.time, text: post.text})
  }
  res.json({ posts: feed });
});

api.post("/users/:id/posts", async (req, res) => {
  let user = res.locals.user;
  let text = req.body.text;
  if (!text) {
    res.status(400).json({ error: "Missing text" });
    return;
  }
  await Posts.insertOne({ userId: user.id, time: new Date(), text });
  res.json({ success: true });
});

api.post("/users/:id/follow", async (req, res) => {
  let user = res.locals.user;
  let target = req.query.target;
  if (!target) {
    res.status(400).json({ error: "Missing artist name" });
    return;
  }
  if (user.following.includes(target)) {
    res.status(400).json({ error: user.id + " is already following " + target });
    return;
  }
  user.following.push(target);
  await Users.replaceOne({ id: user.id }, user);
  res.json({ success: true });
});

api.delete("/users/:id/follow", async (req, res) => {
  let user = res.locals.user;
  let target = req.query.target;
  if (!target) {
    res.status(400).json({ error: "Missing artist name" });
    return;
  }
  if (!user.following.includes(target)) {
    res.status(400).json({ error: user.id + " is not following " + target });
    return;
  }
  let target_ind = user.following.indexOf(target);
  user.following.splice(target_ind, 1);
  await Users.replaceOne({ id: user.id }, user);
  res.json({ success: true });
});

/* Catch-all route to return a JSON error if endpoint not defined.
   Be sure to put all of your endpoints above this one, or they will not be called. */
api.all("/*", (req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

export default initApi;
