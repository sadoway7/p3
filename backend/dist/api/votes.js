"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteOnPost = voteOnPost;
exports.voteOnComment = voteOnComment;
exports.getUserPostVote = getUserPostVote;
exports.getUserCommentVote = getUserCommentVote;
exports.getPostVoteCounts = getPostVoteCounts;
exports.getCommentVoteCounts = getCommentVoteCounts;
exports.includePostVotesInQuery = includePostVotesInQuery;
exports.includeCommentVotesInQuery = includeCommentVotesInQuery;
const mariadb_1 = __importDefault(require("mariadb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = mariadb_1.default.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});
// Vote on a post
function voteOnPost(userId, postId, value) {
    return __awaiter(this, void 0, void 0, function* () {
        if (value !== 1 && value !== -1 && value !== 0) {
            throw new Error('Vote value must be 1, -1, or 0');
        }
        let conn;
        try {
            conn = yield pool.getConnection();
            // Check if the post exists
            const [post] = yield conn.query('SELECT * FROM post WHERE id = ?', [postId]);
            if (!post) {
                throw new Error('Post not found');
            }
            // Check if the user is voting on their own post
            // Uncomment this if you want to prevent users from voting on their own posts
            /*
            if (post.user_id === userId) {
              throw new Error('You cannot vote on your own post');
            }
            */
            // Check if the user has already voted on this post
            const [existingVote] = yield conn.query('SELECT * FROM vote WHERE user_id = ? AND post_id = ?', [userId, postId]);
            if (value === 0) {
                // If value is 0, remove the vote if it exists
                if (existingVote) {
                    yield conn.query('DELETE FROM vote WHERE user_id = ? AND post_id = ?', [userId, postId]);
                    return { message: 'Vote removed' };
                }
                return { message: 'No vote to remove' };
            }
            if (existingVote) {
                // Update the existing vote
                yield conn.query('UPDATE vote SET value = ? WHERE user_id = ? AND post_id = ?', [value, userId, postId]);
                return { message: 'Vote updated' };
            }
            else {
                // Insert a new vote
                yield conn.query('INSERT INTO vote (user_id, post_id, value) VALUES (?, ?, ?)', [userId, postId, value]);
                return { message: 'Vote added' };
            }
        }
        catch (error) {
            console.error('Error voting on post:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Vote on a comment
function voteOnComment(userId, commentId, value) {
    return __awaiter(this, void 0, void 0, function* () {
        if (value !== 1 && value !== -1 && value !== 0) {
            throw new Error('Vote value must be 1, -1, or 0');
        }
        let conn;
        try {
            conn = yield pool.getConnection();
            // Check if the comment exists
            const [comment] = yield conn.query('SELECT * FROM comment WHERE id = ?', [commentId]);
            if (!comment) {
                throw new Error('Comment not found');
            }
            // Check if the user is voting on their own comment
            // Uncomment this if you want to prevent users from voting on their own comments
            /*
            if (comment.user_id === userId) {
              throw new Error('You cannot vote on your own comment');
            }
            */
            // Check if the user has already voted on this comment
            const [existingVote] = yield conn.query('SELECT * FROM vote WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
            if (value === 0) {
                // If value is 0, remove the vote if it exists
                if (existingVote) {
                    yield conn.query('DELETE FROM vote WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
                    return { message: 'Vote removed' };
                }
                return { message: 'No vote to remove' };
            }
            if (existingVote) {
                // Update the existing vote
                yield conn.query('UPDATE vote SET value = ? WHERE user_id = ? AND comment_id = ?', [value, userId, commentId]);
                return { message: 'Vote updated' };
            }
            else {
                // Insert a new vote
                yield conn.query('INSERT INTO vote (user_id, comment_id, value) VALUES (?, ?, ?)', [userId, commentId, value]);
                return { message: 'Vote added' };
            }
        }
        catch (error) {
            console.error('Error voting on comment:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get user's vote on a post
function getUserPostVote(userId, postId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [vote] = yield conn.query('SELECT value FROM vote WHERE user_id = ? AND post_id = ?', [userId, postId]);
            return vote ? vote.value : 0;
        }
        catch (error) {
            console.error('Error getting user post vote:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get user's vote on a comment
function getUserCommentVote(userId, commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [vote] = yield conn.query('SELECT value FROM vote WHERE user_id = ? AND comment_id = ?', [userId, commentId]);
            return vote ? vote.value : 0;
        }
        catch (error) {
            console.error('Error getting user comment vote:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get vote counts for a post
function getPostVoteCounts(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [result] = yield conn.query(`SELECT 
        COUNT(CASE WHEN value = 1 THEN 1 END) as upvotes,
        COUNT(CASE WHEN value = -1 THEN 1 END) as downvotes
      FROM vote
      WHERE post_id = ?`, [postId]);
            const upvotes = result.upvotes || 0;
            const downvotes = result.downvotes || 0;
            return {
                upvotes,
                downvotes,
                total: upvotes - downvotes
            };
        }
        catch (error) {
            console.error('Error getting post vote counts:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get vote counts for a comment
function getCommentVoteCounts(commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [result] = yield conn.query(`SELECT 
        COUNT(CASE WHEN value = 1 THEN 1 END) as upvotes,
        COUNT(CASE WHEN value = -1 THEN 1 END) as downvotes
      FROM vote
      WHERE comment_id = ?`, [commentId]);
            const upvotes = result.upvotes || 0;
            const downvotes = result.downvotes || 0;
            return {
                upvotes,
                downvotes,
                total: upvotes - downvotes
            };
        }
        catch (error) {
            console.error('Error getting comment vote counts:', error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Helper function to update SQL queries to include votes
function includePostVotesInQuery(baseQuery) {
    return baseQuery + `, COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes`;
}
function includeCommentVotesInQuery(baseQuery) {
    return baseQuery + `, COALESCE((SELECT SUM(value) FROM vote v WHERE v.comment_id = c.id), 0) as votes`;
}
