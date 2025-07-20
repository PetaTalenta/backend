const express = require('express');

/**
 * Custom body parser middleware that handles proxy routes correctly
 * This middleware skips body parsing for proxy routes to avoid conflicts
 * with http-proxy-middleware
 */

/**
 * JSON body parser that skips proxy routes
 */
const jsonParser = (req, res, next) => {
  // Skip body parsing for proxy routes
  if (req.url.startsWith('/api/')) {
    return next();
  }
  
  // Use express.json for non-proxy routes
  express.json({ limit: '10mb' })(req, res, next);
};

/**
 * URL-encoded body parser that skips proxy routes
 */
const urlencodedParser = (req, res, next) => {
  // Skip body parsing for proxy routes
  if (req.url.startsWith('/api/')) {
    return next();
  }
  
  // Use express.urlencoded for non-proxy routes
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
};

module.exports = {
  jsonParser,
  urlencodedParser
};
