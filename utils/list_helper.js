const _ = require('lodash')
const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}

const favoriteBlog = (blogs) => {
  if (!blogs || blogs.length === 0) return null
  const favorite = blogs.reduce((max, blog) => blog.likes > max.likes ? blog : max)
  const { title, author, likes } = favorite
  return { title, author, likes }
}

const mostBlogs = (blogs) => {
  if (!blogs || blogs.length === 0) return null
  const groupedByAuthor = _.groupBy(blogs, 'author')
  const authorCounts = _.map(groupedByAuthor, (blogs, author) => ({
    author: author,
    blogs: blogs.length
  }))
  return _.maxBy(authorCounts, 'blogs')
}

const mostLikes = (blogs) => {
  if (!blogs || blogs.length === 0) return null
  const result = _
    .chain(blogs)
    .groupBy('author')
    .map((blogsByAuthor, authorName) => ({
      author: authorName,
      likes: _.sumBy(blogsByAuthor, 'likes')
    }))
    .maxBy('likes')
    .value()
  return result
}

module.exports= {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
} 
