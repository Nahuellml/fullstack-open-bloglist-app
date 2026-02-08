const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const middleware = require("../utils/middleware");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.get("/:id", async (request, response) => {
  const blog = await Blog.findById(request.params.id);
  if (blog) {
    response.json(blog);
  } else {
    response.status(404).end();
  }
});

blogsRouter.post("/", middleware.userExtractor, async (request, response) => {
  const { title, author, url, likes } = request.body;

  const user = request.user;

  const blog = new Blog({
    title,
    author,
    url,
    likes: likes || 0,
    user: user.id,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.status(201).json(savedBlog);
});

blogsRouter.delete(
  "/:id",
  middleware.userExtractor,
  async (request, response) => {
    const blog = await Blog.findById(request.params.id);
    if (!blog) {
      return response.status(404).json({ error: "blog not found" });
    }

    const user = request.user;

    if (blog.user.toString() !== user.id) {
      return response
        .status(403)
        .json({ error: "only the creator can delete this blog" });
    }

    await Blog.findByIdAndDelete(request.params.id);

    await User.findByIdAndUpdate(user.id, {
      $pull: { blogs: request.params.id },
    });

    response.status(204).end();
  },
);

blogsRouter.put("/:id", async (request, response) => {
  const body = request.body;
  const blog = {
    likes: body.likes,
  };
  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, {
    new: true,
    runValidators: true,
    context: "query",
  });

  if (updatedBlog) {
    response.json(updatedBlog);
  } else {
    response.status(404).end();
  }
});

module.exports = blogsRouter;
