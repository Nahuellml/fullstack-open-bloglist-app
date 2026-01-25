const { test, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const supertest = require("supertest");
const app = require("../app");
const api = supertest(app);
const helper = require("./test_helper");
const Blog = require("../models/blog");

describe("when there is initially some blogs saved", () => {
  beforeEach(async () => {
    await Blog.deleteMany({});
    await Blog.insertMany(helper.initialBlogs);
  });

  describe("getting all blogs", () => {
    test("blogs are returned as json", async () => {
      await api
        .get("/api/blogs")
        .expect(200)
        .expect("Content-Type", /application\/json/);
    });

    test("all blogs are returned", async () => {
      const response = await api.get("/api/blogs");
      assert.strictEqual(response.body.length, helper.initialBlogs.length);
    });

    test("a specific blog title is within the returned blogs", async () => {
      const response = await api.get("/api/blogs");
      const contents = response.body.map((blog) => blog.title);
      assert(contents.includes("React patterns"));
    });

    test("all blogs possess a unique identifier property named id", async () => {
      const response = await api.get("/api/blogs");
      assert.ok(response.body[0].id);
      assert.strictEqual(typeof response.body[0]._id, "undefined");
    });
  });

  describe("viewing a specific blog", () => {
    test("succeeds with a valid id", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToView = blogsAtStart[0];

      const resultBlog = await api
        .get(`/api/blogs/${blogToView.id}`)
        .expect(200)
        .expect("Content-Type", /application\/json/);

      assert.deepStrictEqual(resultBlog.body, blogToView);
    });

    test("fails with statuscode 404 if blog does not exist", async () => {
      const validNonexistingId = await helper.nonExistingId();

      await api.get(`/api/blogs/${validNonexistingId}`).expect(404);
    });
  });

  describe("addition of a new blog", () => {
    test("succeeds with valid data", async () => {
      const newBlog = {
        title: "Canonical string reduction",
        author: "Edsger W. Dijkstra",
        url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
        likes: 12,
      };

      await api
        .post("/api/blogs")
        .send(newBlog)
        .expect(201)
        .expect("Content-Type", /application\/json/);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1);

      const titles = blogsAtEnd.map((blog) => blog.title);
      assert(titles.includes("Canonical string reduction"));
    });

    test("defaults to 0 likes if the property is missing", async () => {
      const newBlog = {
        title: "First class tests",
        author: "Robert C. Martin",
        url: "http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html",
      };

      const response = await api.post("/api/blogs").send(newBlog).expect(201);
      assert.strictEqual(response.body.likes, 0);
    });

    test("fails with status code 400 if title or url are missing", async () => {
      const newBlog = {
        author: "Robert C. Martin",
        likes: 0,
      };
      await api.post("/api/blogs").send(newBlog).expect(400);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length);
    });
  });

  describe("deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToDelete = blogsAtStart[0];

      await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1);

      const titles = blogsAtEnd.map((r) => r.title);
      assert(!titles.includes(blogToDelete.title));
    });
  });

  describe("updating a blog", () => {
    test("succeeds with status code 200 and updates likes", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const updatedBlog = {
        likes: blogToUpdate.likes + 1,
      };

      const response = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedBlog)
        .expect(200);

      assert.strictEqual(response.body.likes, blogToUpdate.likes + 1);
    });
  });
});

after(async () => {
  await mongoose.connection.close();
});
