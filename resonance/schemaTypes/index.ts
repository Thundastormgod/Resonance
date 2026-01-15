import article from './article'
import author from './author'
import category from './category'
import siteSettings from './siteSettings'
import generatedArticle from './generatedArticle'
import dataSource from './dataSource'
import adminUser from './adminUser'

export const schemaTypes = [
  siteSettings, 
  article, 
  author, 
  category,
  // AI News Generation
  generatedArticle,
  dataSource,
  // Admin & Authentication
  adminUser,
]
