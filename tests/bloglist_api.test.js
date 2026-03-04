const { test, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const helper = require("./test_helper");
const Blog = require("../models/blog");
const User = require("../models/user");

const api = helper.api;

// ============================================
// SETUP: Initial data with user and token
// ============================================
describe("when there is initially some blogs saved", () => {
  let token;

  beforeEach(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});

    await helper.createUser({
      username: "root",
      name: "Root",
      password: "sekret",
    });
    token = await helper.getToken({ username: "root", password: "sekret" });

    await Blog.insertMany(helper.initialBlogs);
  });

  // ----------------------------------------
  // GET /api/blogs - Get all blogs
  // ----------------------------------------
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
      const titles = response.body.map((blog) => blog.title);
      assert(titles.includes("React patterns"));
    });

    test("all blogs possess a unique identifier property named id", async () => {
      const response = await api.get("/api/blogs");
      assert.ok(response.body[0].id);
      assert.strictEqual(typeof response.body[0]._id, "undefined");
    });
  });

  // ----------------------------------------
  // GET /api/blogs/:id - Get specific blog
  // ----------------------------------------
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

  // ----------------------------------------
  // POST /api/blogs - Create blog
  // ----------------------------------------
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
        .set("Authorization", `Bearer ${token}`)
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

      const response = await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(201);
      assert.strictEqual(response.body.likes, 0);
    });

    test("fails with status code 400 if title or url are missing", async () => {
      const newBlog = { author: "Robert C. Martin", likes: 0 };

      await api
        .post("/api/blogs")
        .set("Authorization", `Bearer ${token}`)
        .send(newBlog)
        .expect(400);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length);
    });
  });

  // ----------------------------------------
  // DELETE /api/blogs/:id - Delete blog
  // ----------------------------------------
  describe("deletion of a blog", () => {
    test("succeeds with status code 204 if id is valid", async () => {
      const createdBlog = await helper.createBlog(
        { title: "Blog to delete", author: "Test", url: "http://test.com" },
        token,
      );

      await api
        .delete(`/api/blogs/${createdBlog.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const blogsAtEnd = await helper.blogsInDb();
      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length);

      const titles = blogsAtEnd.map((r) => r.title);
      assert(!titles.includes("Blog to delete"));
    });
  });

  // ----------------------------------------
  // PUT /api/blogs/:id - Update blog
  // ----------------------------------------
  describe("updating a blog", () => {
    test("succeeds with status code 200 and updates likes", async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const response = await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send({ likes: blogToUpdate.likes + 1 })
        .expect(200);

      assert.strictEqual(response.body.likes, blogToUpdate.likes + 1);
    });
  });
});

// ============================================
// Login Tests
// ============================================
describe("login", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await helper.createUser({
      username: "root",
      name: "Root",
      password: "sekret",
    });
  });

  test("succeeds with valid credentials", async () => {
    const result = await api
      .post("/api/login")
      .send({ username: "root", password: "sekret" })
      .expect(200)
      .expect("Content-Type", /application\/json/);

    assert(result.body.token);
    assert(result.body.username === "root");
  });

  test("fails with invalid password", async () => {
    const result = await api
      .post("/api/login")
      .send({ username: "root", password: "wrong" })
      .expect(401)
      .expect("Content-Type", /application\/json/);

    assert(result.body.error === "invalid username or password");
  });

  test("fails with invalid username", async () => {
    const result = await api
      .post("/api/login")
      .send({ username: "nonexistent", password: "sekret" })
      .expect(401)
      .expect("Content-Type", /application\/json/);

    assert(result.body.error === "invalid username or password");
  });
});

// ============================================
// Authentication Tests for Creating Blogs
// ============================================
describe("creating a blog with authentication", () => {
  let token;

  beforeEach(async () => {
    await User.deleteMany({});
    await Blog.deleteMany({});

    await helper.createUser({
      username: "root",
      name: "Root",
      password: "sekret",
    });
    token = await helper.getToken({ username: "root", password: "sekret" });
  });

  test("succeeds with valid token", async () => {
    await api
      .post("/api/blogs")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test blog", author: "Author", url: "http://test.com" })
      .expect(201)
      .expect("Content-Type", /application\/json/);
  });

  test("fails without token", async () => {
    await api
      .post("/api/blogs")
      .send({ title: "Test blog", author: "Author", url: "http://test.com" })
      .expect(401);
  });
});

// ============================================
// Blog Deletion Tests (Authorization)
// ============================================
describe("deleting a blog", () => {
  let token;
  let blogIdToDelete;

  beforeEach(async () => {
    await User.deleteMany({});
    await Blog.deleteMany({});

    await helper.createUser({
      username: "root",
      name: "Root",
      password: "sekret",
    });
    token = await helper.getToken({ username: "root", password: "sekret" });

    const createdBlog = await helper.createBlog(
      { title: "Blog to delete", author: "root", url: "http://test.com" },
      token,
    );
    blogIdToDelete = createdBlog.id;
  });

  test("fails with 403 when deleting another user's blog", async () => {
    await helper.createUser({
      username: "otheruser",
      name: "Other",
      password: "password123",
    });
    const otherToken = await helper.getToken({
      username: "otheruser",
      password: "password123",
    });

    await api
      .delete(`/api/blogs/${blogIdToDelete}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });

  test("succeeds when deleting own blog", async () => {
    await api
      .delete(`/api/blogs/${blogIdToDelete}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});

// Cleanup - close DB connection
after(async () => {
  await helper.closeDatabase();
});
