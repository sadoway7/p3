const fs = require('fs');
const path = require('path');

// Read the index.ts file
const indexPath = path.join(__dirname, 'index.ts');
let content = fs.readFileSync(indexPath, 'utf8');

// Replace plural table names with singular ones
content = content.replace(/FROM communities WHERE/g, 'FROM community WHERE');
content = content.replace(/FROM community_members WHERE/g, 'FROM community_member WHERE');
content = content.replace(/FROM posts WHERE/g, 'FROM post WHERE');
content = content.replace(/FROM comments WHERE/g, 'FROM comment WHERE');
content = content.replace(/FROM users WHERE/g, 'FROM user WHERE');
content = content.replace(/FROM votes WHERE/g, 'FROM vote WHERE');

// Check for more plural table names
content = content.replace(/INSERT INTO communities/g, 'INSERT INTO community');
content = content.replace(/INSERT INTO community_members/g, 'INSERT INTO community_member');
content = content.replace(/INSERT INTO posts/g, 'INSERT INTO post');
content = content.replace(/INSERT INTO comments/g, 'INSERT INTO comment');
content = content.replace(/INSERT INTO users/g, 'INSERT INTO user');
content = content.replace(/INSERT INTO votes/g, 'INSERT INTO vote');

content = content.replace(/UPDATE communities/g, 'UPDATE community');
content = content.replace(/UPDATE community_members/g, 'UPDATE community_member');
content = content.replace(/UPDATE posts/g, 'UPDATE post');
content = content.replace(/UPDATE comments/g, 'UPDATE comment');
content = content.replace(/UPDATE users/g, 'UPDATE user');
content = content.replace(/UPDATE votes/g, 'UPDATE vote');

content = content.replace(/DELETE FROM communities/g, 'DELETE FROM community');
content = content.replace(/DELETE FROM community_members/g, 'DELETE FROM community_member');
content = content.replace(/DELETE FROM posts/g, 'DELETE FROM post');
content = content.replace(/DELETE FROM comments/g, 'DELETE FROM comment');
content = content.replace(/DELETE FROM users/g, 'DELETE FROM user');
content = content.replace(/DELETE FROM votes/g, 'DELETE FROM vote');

// Write the updated content back
fs.writeFileSync(indexPath, content, 'utf8');

console.log('Updated table names from plural to singular in index.ts');

// Now check the routes files
const routesDir = path.join(__dirname, 'routes');
const routeFiles = fs.readdirSync(routesDir);

routeFiles.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let routeContent = fs.readFileSync(filePath, 'utf8');
    
    // Replace plural table names with singular ones
    routeContent = routeContent.replace(/FROM communities/g, 'FROM community');
    routeContent = routeContent.replace(/FROM community_members/g, 'FROM community_member');
    routeContent = routeContent.replace(/FROM posts/g, 'FROM post');
    routeContent = routeContent.replace(/FROM comments/g, 'FROM comment');
    routeContent = routeContent.replace(/FROM users/g, 'FROM user');
    routeContent = routeContent.replace(/FROM votes/g, 'FROM vote');
    
    routeContent = routeContent.replace(/INSERT INTO communities/g, 'INSERT INTO community');
    routeContent = routeContent.replace(/INSERT INTO community_members/g, 'INSERT INTO community_member');
    routeContent = routeContent.replace(/INSERT INTO posts/g, 'INSERT INTO post');
    routeContent = routeContent.replace(/INSERT INTO comments/g, 'INSERT INTO comment');
    routeContent = routeContent.replace(/INSERT INTO users/g, 'INSERT INTO user');
    routeContent = routeContent.replace(/INSERT INTO votes/g, 'INSERT INTO vote');
    
    routeContent = routeContent.replace(/UPDATE communities/g, 'UPDATE community');
    routeContent = routeContent.replace(/UPDATE community_members/g, 'UPDATE community_member');
    routeContent = routeContent.replace(/UPDATE posts/g, 'UPDATE post');
    routeContent = routeContent.replace(/UPDATE comments/g, 'UPDATE comment');
    routeContent = routeContent.replace(/UPDATE users/g, 'UPDATE user');
    routeContent = routeContent.replace(/UPDATE votes/g, 'UPDATE vote');
    
    routeContent = routeContent.replace(/DELETE FROM communities/g, 'DELETE FROM community');
    routeContent = routeContent.replace(/DELETE FROM community_members/g, 'DELETE FROM community_member');
    routeContent = routeContent.replace(/DELETE FROM posts/g, 'DELETE FROM post');
    routeContent = routeContent.replace(/DELETE FROM comments/g, 'DELETE FROM comment');
    routeContent = routeContent.replace(/DELETE FROM users/g, 'DELETE FROM user');
    routeContent = routeContent.replace(/DELETE FROM votes/g, 'DELETE FROM vote');
    
    fs.writeFileSync(filePath, routeContent, 'utf8');
    console.log(`Updated table names in routes/${file}`);
  }
});

console.log('Database table name corrections completed');