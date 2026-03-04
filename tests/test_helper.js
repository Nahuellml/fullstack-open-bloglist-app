const Blog = require("../models/blog");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app");

// ============================================
// API configured for tests (single source)
// ============================================
const api = supertest(app);

// ============================================
// Cleanup - close DB connection
// ============================================
const closeDatabase = async () => {
  await mongoose.connection.close();
};

// ============================================
// Initial test data
// ============================================
const initialBlogs = [
  {
    _id: "5a422a851b54a676234d17f7",
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7,
    __v: 0,
  },
  {
    _id: "5a422aa71b54a676234d17f8",
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    likes: 5,
    __v: 0,
  },
];

// ============================================
// Database helpers
// ============================================
const nonExistingId = async () => {
  const blog = new Blog({
    title: "willremovethissoon",
    url: "http://temp.com",
  });
  await blog.save();
  await blog.deleteOne();

  return blog._id.toString();
};

const blogsInDb = async () => {
  const blogs = await Blog.find({});
  return blogs.map((blog) => blog.toJSON());
};

const usersInDb = async () => {
  const users = await User.find({});
  return users.map((user) => user.toJSON());
};

// ============================================
// Entity creation helpers
// ============================================
const createUser = async ({ username, name, password }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, name, passwordHash });
  await user.save();
  return user;
};

const getToken = async ({ username, password }) => {
  const result = await api.post("/api/login").send({ username, password });
  return result.body.token;
};

const createBlog = async (blogData, token) => {
  const result = await api
    .post("/api/blogs")
    .set("Authorization", `Bearer ${token}`)
    .send(blogData);
  return result.body;
};

module.exports = {
  api,
  initialBlogs,
  nonExistingId,
  blogsInDb,
  usersInDb,
  createUser,
  getToken,
  createBlog,
  closeDatabase,
};
