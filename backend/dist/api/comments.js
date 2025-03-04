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
exports.getPostComments = getPostComments;
exports.getComment = getComment;
exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
exports.getCommentReplies = getCommentReplies;
exports.getThreadedComments = getThreadedComments;
const uuid_1 = require("uuid");
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
// Get all comments for a post
function getPostComments(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const comments = yield conn.query("SELECT * FROM comment WHERE post_id = ? ORDER BY created_at ASC", [postId]);
            return comments;
        }
        catch (error) {
            console.error("Error fetching comments:", error);
            throw new Error('Failed to fetch comments');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get a specific comment
function getComment(commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [comment] = yield conn.query("SELECT * FROM comment WHERE id = ?", [commentId]);
            return comment || null;
        }
        catch (error) {
            console.error("Error fetching comment:", error);
            throw new Error('Failed to fetch comment');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Create a new comment
function createComment(userId, commentData) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const id = (0, uuid_1.v4)();
            conn = yield pool.getConnection();
            // Build the query based on whether parent_comment_id is provided
            let query = "INSERT INTO comment (id, content, user_id, post_id";
            let values = [id, commentData.content, userId, commentData.post_id];
            if (commentData.parent_comment_id) {
                query += ", parent_comment_id) VALUES (?, ?, ?, ?, ?)";
                values.push(commentData.parent_comment_id);
            }
            else {
                query += ") VALUES (?, ?, ?, ?)";
            }
            yield conn.query(query, values);
            const [newComment] = yield conn.query("SELECT * FROM comment WHERE id = ?", [id]);
            return newComment;
        }
        catch (error) {
            console.error("Error creating comment:", error);
            throw new Error('Failed to create comment');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Update a comment
function updateComment(commentId, userId, content) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Check if the user is the author of the comment
            const [comment] = yield conn.query("SELECT * FROM comment WHERE id = ?", [commentId]);
            if (!comment) {
                return null;
            }
            if (comment.user_id !== userId) {
                throw new Error('You can only update your own comments');
            }
            yield conn.query("UPDATE comment SET content = ?, updated_at = NOW() WHERE id = ?", [content, commentId]);
            const [updatedComment] = yield conn.query("SELECT * FROM comment WHERE id = ?", [commentId]);
            return updatedComment;
        }
        catch (error) {
            console.error("Error updating comment:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Delete a comment
function deleteComment(commentId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Check if the user is the author of the comment
            const [comment] = yield conn.query("SELECT * FROM comment WHERE id = ?", [commentId]);
            if (!comment) {
                return false;
            }
            if (comment.user_id !== userId) {
                throw new Error('You can only delete your own comments');
            }
            // Start a transaction to handle deleting the comment and its replies
            yield conn.beginTransaction();
            // Delete all replies to this comment
            yield conn.query("DELETE FROM comment WHERE parent_comment_id = ?", [commentId]);
            // Delete the comment itself
            const result = yield conn.query("DELETE FROM comment WHERE id = ?", [commentId]);
            yield conn.commit();
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error("Error deleting comment:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get replies to a comment
function getCommentReplies(commentId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const replies = yield conn.query("SELECT * FROM comment WHERE parent_comment_id = ? ORDER BY created_at ASC", [commentId]);
            return replies;
        }
        catch (error) {
            console.error("Error fetching comment replies:", error);
            throw new Error('Failed to fetch comment replies');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Get threaded comments for a post
function getThreadedComments(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Get all comments for the post
            const comments = yield conn.query("SELECT c.*, u.username FROM comment c " +
                "JOIN user u ON c.user_id = u.id " +
                "WHERE c.post_id = ? " +
                "ORDER BY c.created_at ASC", [postId]);
            // Organize comments into a threaded structure
            const commentMap = new Map();
            const rootComments = [];
            // First pass: create a map of all comments
            comments.forEach((comment) => {
                comment.replies = [];
                commentMap.set(comment.id, comment);
            });
            // Second pass: organize into a tree structure
            comments.forEach((comment) => {
                if (comment.parent_comment_id) {
                    const parent = commentMap.get(comment.parent_comment_id);
                    if (parent) {
                        parent.replies.push(comment);
                    }
                    else {
                        rootComments.push(comment);
                    }
                }
                else {
                    rootComments.push(comment);
                }
            });
            return rootComments;
        }
        catch (error) {
            console.error("Error fetching threaded comments:", error);
            throw new Error('Failed to fetch threaded comments');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
