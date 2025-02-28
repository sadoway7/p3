import { v4 as uuidv4 } from 'uuid';
import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

export interface Comment {
    id: string;
    content: string;
    user_id: string;
    post_id: string;
    parent_comment_id?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CommentInput {
    content: string;
    post_id: string;
    parent_comment_id?: string;
}

// Get all comments for a post
export async function getPostComments(postId: string): Promise<Comment[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const comments = await conn.query(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
            [postId]
        );
        return comments;
    } catch (error) {
        console.error("Error fetching comments:", error);
        throw new Error('Failed to fetch comments');
    } finally {
        if (conn) conn.end();
    }
}

// Get a specific comment
export async function getComment(commentId: string): Promise<Comment | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        const [comment] = await conn.query(
            "SELECT * FROM comments WHERE id = ?",
            [commentId]
        );
        return comment || null;
    } catch (error) {
        console.error("Error fetching comment:", error);
        throw new Error('Failed to fetch comment');
    } finally {
        if (conn) conn.end();
    }
}

// Create a new comment
export async function createComment(userId: string, commentData: CommentInput): Promise<Comment> {
    let conn;
    try {
        const id = uuidv4();
        conn = await pool.getConnection();
        
        // Build the query based on whether parent_comment_id is provided
        let query = "INSERT INTO comments (id, content, user_id, post_id";
        let values = [id, commentData.content, userId, commentData.post_id];
        
        if (commentData.parent_comment_id) {
            query += ", parent_comment_id) VALUES (?, ?, ?, ?, ?)";
            values.push(commentData.parent_comment_id);
        } else {
            query += ") VALUES (?, ?, ?, ?)";
        }
        
        await conn.query(query, values);
        
        const [newComment] = await conn.query("SELECT * FROM comments WHERE id = ?", [id]);
        return newComment;
    } catch (error) {
        console.error("Error creating comment:", error);
        throw new Error('Failed to create comment');
    } finally {
        if (conn) conn.end();
    }
}

// Update a comment
export async function updateComment(
    commentId: string, 
    userId: string, 
    content: string
): Promise<Comment | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if the user is the author of the comment
        const [comment] = await conn.query(
            "SELECT * FROM comments WHERE id = ?",
            [commentId]
        );
        
        if (!comment) {
            return null;
        }
        
        if (comment.user_id !== userId) {
            throw new Error('You can only update your own comments');
        }
        
        await conn.query(
            "UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?",
            [content, commentId]
        );
        
        const [updatedComment] = await conn.query(
            "SELECT * FROM comments WHERE id = ?",
            [commentId]
        );
        return updatedComment;
    } catch (error) {
        console.error("Error updating comment:", error);
        throw error;
    } finally {
        if (conn) conn.end();
    }
}

// Delete a comment
export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if the user is the author of the comment
        const [comment] = await conn.query(
            "SELECT * FROM comments WHERE id = ?",
            [commentId]
        );
        
        if (!comment) {
            return false;
        }
        
        if (comment.user_id !== userId) {
            throw new Error('You can only delete your own comments');
        }
        
        // Start a transaction to handle deleting the comment and its replies
        await conn.beginTransaction();
        
        // Delete all replies to this comment
        await conn.query(
            "DELETE FROM comments WHERE parent_comment_id = ?",
            [commentId]
        );
        
        // Delete the comment itself
        const result = await conn.query(
            "DELETE FROM comments WHERE id = ?",
            [commentId]
        );
        
        await conn.commit();
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error deleting comment:", error);
        if (conn) {
            await conn.rollback();
        }
        throw error;
    } finally {
        if (conn) conn.end();
    }
}

// Get replies to a comment
export async function getCommentReplies(commentId: string): Promise<Comment[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const replies = await conn.query(
            "SELECT * FROM comments WHERE parent_comment_id = ? ORDER BY created_at ASC",
            [commentId]
        );
        return replies;
    } catch (error) {
        console.error("Error fetching comment replies:", error);
        throw new Error('Failed to fetch comment replies');
    } finally {
        if (conn) conn.end();
    }
}

// Define a type for threaded comments
export interface ThreadedComment extends Comment {
    username: string;
    replies: ThreadedComment[];
}

// Get threaded comments for a post
export async function getThreadedComments(postId: string): Promise<ThreadedComment[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get all comments for the post
        const comments: ThreadedComment[] = await conn.query(
            "SELECT c.*, u.username FROM comments c " +
            "JOIN users u ON c.user_id = u.id " +
            "WHERE c.post_id = ? " +
            "ORDER BY c.created_at ASC",
            [postId]
        );
        
        // Organize comments into a threaded structure
        const commentMap = new Map<string, ThreadedComment>();
        const rootComments: ThreadedComment[] = [];
        
        // First pass: create a map of all comments
        comments.forEach((comment: ThreadedComment) => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        // Second pass: organize into a tree structure
        comments.forEach((comment: ThreadedComment) => {
            if (comment.parent_comment_id) {
                const parent = commentMap.get(comment.parent_comment_id);
                if (parent) {
                    parent.replies.push(comment);
                } else {
                    rootComments.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });
        
        return rootComments;
    } catch (error) {
        console.error("Error fetching threaded comments:", error);
        throw new Error('Failed to fetch threaded comments');
    } finally {
        if (conn) conn.end();
    }
}
