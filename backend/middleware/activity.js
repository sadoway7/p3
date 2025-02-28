const { logActivity } = require('../api/activity');

/**
 * Middleware to log user activities
 * @param {string} activityType - The type of activity (e.g., 'POST', 'COMMENT', 'VOTE')
 * @param {string} actionType - The type of action (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {Function} getEntityInfo - Function to extract entity info from request (returns { entityId, entityType, metadata })
 * @returns {Function} Express middleware function
 */
function logActivityMiddleware(activityType, actionType, getEntityInfo) {
  return async (req, res, next) => {
    // Store the original end function
    const originalEnd = res.end;
    let activityLogged = false;
    
    // Override the end function
    res.end = async function(chunk, encoding) {
      // Only log activities once to prevent duplicate logging
      if (activityLogged) {
        return originalEnd.call(this, chunk, encoding);
      }
      
      // Mark as logged to prevent double logging if there's an error
      activityLogged = true;
      
      // Only log activities for successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Get user ID from authenticated user
          const userId = req.user ? req.user.id : null;
          
          if (userId) {
            // Get entity info from the provided function
            let entityInfo = { entityId: null, entityType: null, metadata: null };
            
            try {
              entityInfo = getEntityInfo(req, res) || entityInfo;
            } catch (entityError) {
              console.error('Error extracting entity info:', entityError);
            }
            
            const { entityId, entityType, metadata } = entityInfo;
            
            // Get IP address and user agent
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'];
            
            // Log the activity without waiting for it to complete
            logActivity({
              userId,
              activityType,
              actionType,
              entityId,
              entityType,
              metadata,
              ipAddress,
              userAgent
            }).catch(error => {
              console.error('Error logging activity:', error);
            });
          }
        } catch (error) {
          // Just log the error, don't affect the response
          console.error('Error in activity middleware:', error);
        }
      }
      
      // Call the original end function
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Helper function to log user login activity
 */
function logUserLogin(req, res, next) {
  // Store the original end function
  const originalEnd = res.end;
  let activityLogged = false;
  
  // Override the end function
  res.end = async function(chunk, encoding) {
    // Only log activities once to prevent duplicate logging
    if (activityLogged) {
      return originalEnd.call(this, chunk, encoding);
    }
    
    // Mark as logged to prevent double logging if there's an error
    activityLogged = true;
    
    // Only log activities for successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Get user ID from response body
        let userId = null;
        
        if (chunk) {
          try {
            const responseBody = JSON.parse(chunk.toString());
            userId = responseBody && responseBody.user ? responseBody.user.id : null;
          } catch (parseError) {
            console.error('Error parsing response body:', parseError);
          }
        }
        
        if (userId) {
          // Get IP address and user agent
          const ipAddress = req.ip || req.connection.remoteAddress;
          const userAgent = req.headers['user-agent'];
          
          // Log the activity without waiting for it to complete
          logActivity({
            userId,
            activityType: 'USER',
            actionType: 'LOGIN',
            entityId: userId,
            entityType: 'user',
            metadata: null,
            ipAddress,
            userAgent
          }).catch(error => {
            console.error('Error logging login activity:', error);
          });
        }
      } catch (error) {
        // Just log the error, don't affect the response
        console.error('Error in login activity middleware:', error);
      }
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Helper function to log user registration activity
 */
function logUserRegistration(req, res, next) {
  // Store the original end function
  const originalEnd = res.end;
  let activityLogged = false;
  
  // Override the end function
  res.end = async function(chunk, encoding) {
    // Only log activities once to prevent duplicate logging
    if (activityLogged) {
      return originalEnd.call(this, chunk, encoding);
    }
    
    // Mark as logged to prevent double logging if there's an error
    activityLogged = true;
    
    // Only log activities for successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        // Get user ID from response body
        let userId = null;
        let username = null;
        
        if (chunk) {
          try {
            const responseBody = JSON.parse(chunk.toString());
            if (responseBody && responseBody.user) {
              userId = responseBody.user.id;
              username = responseBody.user.username;
            }
          } catch (parseError) {
            console.error('Error parsing response body:', parseError);
          }
        }
        
        if (userId) {
          // Get IP address and user agent
          const ipAddress = req.ip || req.connection.remoteAddress;
          const userAgent = req.headers['user-agent'];
          
          // Log the activity without waiting for it to complete
          logActivity({
            userId,
            activityType: 'USER',
            actionType: 'REGISTER',
            entityId: userId,
            entityType: 'user',
            metadata: { username },
            ipAddress,
            userAgent
          }).catch(error => {
            console.error('Error logging registration activity:', error);
          });
        }
      } catch (error) {
        // Just log the error, don't affect the response
        console.error('Error in registration activity middleware:', error);
      }
    }
    
    // Call the original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Helper function to log user logout activity
 */
function logUserLogout(req, res, next) {
  // Get user ID from authenticated user
  const userId = req.user ? req.user.id : null;
  
  if (userId) {
    // Get IP address and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Log the activity without waiting for the middleware to complete
    logActivity({
      userId,
      activityType: 'USER',
      actionType: 'LOGOUT',
      entityId: userId,
      entityType: 'user',
      metadata: null,
      ipAddress,
      userAgent
    }).catch(error => {
      console.error('Error logging logout activity:', error);
    });
  }
  
  next();
}

// Common entity info extractors
const entityInfoExtractors = {
  // Post entity info extractors
  post: {
    create: (req) => ({
      entityId: req.body.id || null, // For new posts, the ID might be in the response
      entityType: 'post',
      metadata: {
        title: req.body.title,
        community_id: req.body.communityId || req.body.community_id
      }
    }),
    update: (req) => ({
      entityId: req.params.id || req.params.postId,
      entityType: 'post',
      metadata: {
        title: req.body.title
      }
    }),
    delete: (req) => ({
      entityId: req.params.id || req.params.postId,
      entityType: 'post',
      metadata: null
    })
  },
  
  // Comment entity info extractors
  comment: {
    create: (req) => ({
      entityId: req.body.id || null, // For new comments, the ID might be in the response
      entityType: 'comment',
      metadata: {
        post_id: req.params.postId || req.body.post_id || req.body.postId,
        parent_comment_id: req.body.parentCommentId || req.body.parent_comment_id
      }
    }),
    update: (req) => ({
      entityId: req.params.id || req.params.commentId,
      entityType: 'comment',
      metadata: null
    }),
    delete: (req) => ({
      entityId: req.params.id || req.params.commentId,
      entityType: 'comment',
      metadata: null
    })
  },
  
  // Vote entity info extractors
  vote: {
    create: (req) => {
      if (req.params.postId || req.body.postId || req.body.post_id) {
        return {
          entityId: req.params.postId || req.body.postId || req.body.post_id,
          entityType: 'post',
          metadata: {
            value: req.body.value
          }
        };
      } else if (req.params.commentId || req.body.commentId || req.body.comment_id) {
        return {
          entityId: req.params.commentId || req.body.commentId || req.body.comment_id,
          entityType: 'comment',
          metadata: {
            value: req.body.value
          }
        };
      }
      return { entityId: null, entityType: null, metadata: null };
    }
  },
  
  // Community entity info extractors
  community: {
    create: (req) => ({
      entityId: req.body.id || null, // For new communities, the ID might be in the response
      entityType: 'community',
      metadata: {
        name: req.body.name
      }
    }),
    update: (req) => ({
      entityId: req.params.id || req.params.communityId,
      entityType: 'community',
      metadata: {
        name: req.body.name
      }
    }),
    join: (req) => ({
      entityId: req.params.id || req.params.communityId,
      entityType: 'community',
      metadata: null
    }),
    leave: (req) => ({
      entityId: req.params.id || req.params.communityId,
      entityType: 'community',
      metadata: null
    })
  }
};

module.exports = {
  logActivityMiddleware,
  logUserLogin,
  logUserRegistration,
  logUserLogout,
  entityInfoExtractors
};