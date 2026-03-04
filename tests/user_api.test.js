const { test, after, beforeEach, describe } = require("node:test");
const assert = require("node:assert");
const helper = require("./test_helper");
const User = require("../models/user");

const api = helper.api;

// ============================================
// SETUP: One initial user
// ============================================
describe("when there is initially one user in db", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await helper.createUser({
      username: "root",
      name: "Root",
      password: "sekret",
    });
  });

  // ----------------------------------------
  // POST /api/users - Create user
  // ----------------------------------------
  test("creation succeeds with a fresh username", async () => {
    const usersAtStart = await helper.usersInDb();

    await api
      .post("/api/users")
      .send({
        username: "mluukkai",
        name: "Matti Luukkainen",
        password: "salainen",
      })
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1);

    const usernames = usersAtEnd.map((u) => u.username);
    assert(usernames.includes("mluukkai"));
  });

  test("creation fails with proper statuscode and message if username already taken", async () => {
    const usersAtStart = await helper.usersInDb();

    const result = await api
      .post("/api/users")
      .send({ username: "root", name: "Superuser", password: "salainen" })
      .expect(400)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes("expected `username` to be unique"));
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails if password is too short", async () => {
    const usersAtStart = await helper.usersInDb();

    const result = await api
      .post("/api/users")
      .send({ username: "validuser", name: "Test", password: "12" })
      .expect(400)
      .expect("Content-Type", /application\/json/);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes("password"));
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });

  test("creation fails if username is too short", async () => {
    const usersAtStart = await helper.usersInDb();

    const result = await api
      .post("/api/users")
      .send({ username: "ab", name: "Test", password: "salainen" })
      .expect(400);

    const usersAtEnd = await helper.usersInDb();
    assert(result.body.error.includes("username"));
    assert.strictEqual(usersAtEnd.length, usersAtStart.length);
  });
});

// Cleanup - close DB connection
after(async () => {
  await helper.closeDatabase();
});
