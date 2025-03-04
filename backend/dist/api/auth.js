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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getCurrentUser = getCurrentUser;
exports.verifyToken = verifyToken;
exports.logout = logout;
// Updated auth.ts for the new database schema
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const activity_1 = require("./activity");
const connection_1 = __importDefault(require("../db/connection"));
dotenv_1.default.config();
// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Token expiration (1 day)
const TOKEN_EXPIRATION = '1d';
// Password validation
const isStrongPassword = (password) => {
    // At least 8 characters
    if (password.length < 8)
        return false;
    // Check for uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};
// User registration
function register(userData) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            // Validate password strength
            if (!isStrongPassword(userData.password)) {
                throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
            }
            conn = yield connection_1.default.getConnection();
            // Start transaction
            yield conn.beginTransaction();
            // Check if username or email already exists
            const [existingUser] = yield conn.query("SELECT * FROM user WHERE username = ? OR email = ?", [userData.username, userData.email]);
            if (Array.isArray(existingUser) && existingUser.length > 0) {
                throw new Error('Username or email already exists');
            }
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = yield bcrypt_1.default.hash(userData.password, saltRounds);
            // Create new user
            const id = (0, uuid_1.v4)();
            const now = new Date();
            yield conn.query(`INSERT INTO user (
        id, username, email, password_hash, role, 
        created_at, updated_at, cake_day, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, userData.username, userData.email, hashedPassword, 'user', now, now, now, now]);
            // Create user statistics record
            yield conn.query(`INSERT INTO user_statistic (
        user_id, karma, posts_count, comments_count, 
        upvotes_received, downvotes_received, upvotes_given, 
        downvotes_given, communities_joined, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, 0, 0, 0, 0, 0, 0, 0, 0, now, now]);
            // Create user settings record
            yield conn.query(`INSERT INTO user_setting (
        user_id, email_notifications, push_notifications, 
        theme, content_filter, allow_followers, 
        display_online_status, language, timezone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, true, true, 'light', 'standard', true, true, 'en', 'UTC', now]);
            // Commit transaction
            yield conn.commit();
            // Get the created user (without password)
            const [newUser] = yield conn.query(`SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
        s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.id = ?`, [id]);
            // Log activity
            try {
                yield (0, activity_1.logActivity)({
                    userId: id,
                    activityType: 'USER',
                    actionType: 'REGISTER',
                    entityId: id,
                    entityType: 'user',
                    metadata: { username: userData.username, email: userData.email },
                    ipAddress: undefined,
                    userAgent: undefined
                });
            }
            catch (error) {
                console.error("Error logging registration activity:", error);
                // Don't throw, just log the error
            }
            return { user: newUser };
        }
        catch (error) {
            // Rollback transaction on error
            if (conn) {
                try {
                    yield conn.rollback();
                }
                catch (rollbackError) {
                    console.error("Error rolling back transaction:", rollbackError);
                }
            }
            console.error("Error registering user:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
// User login
function login(credentials) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
            // Find user by username
            const userResult = yield conn.query(`SELECT u.*, s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.username = ?`, [credentials.username]);
            const [rows] = userResult;
            const user = rows[0];
            if (!user) {
                throw new Error('Invalid username or password');
            }
            // Compare passwords
            const passwordMatch = yield bcrypt_1.default.compare(credentials.password, user.password_hash || '');
            if (!passwordMatch) {
                throw new Error('Invalid username or password');
            }
            // Update last_active timestamp
            yield conn.query("UPDATE user SET last_active = ? WHERE id = ?", [new Date(), user.id]);
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
            // Log activity
            try {
                yield (0, activity_1.logActivity)({
                    userId: user.id,
                    activityType: 'USER',
                    actionType: 'LOGIN',
                    entityId: user.id,
                    entityType: 'user',
                    metadata: null,
                    ipAddress: undefined,
                    userAgent: undefined
                });
            }
            catch (error) {
                console.error("Error logging login activity:", error);
                // Don't throw, just log the error
            }
            // Return user info and token (without password)
            const { password_hash } = user, userWithoutPassword = __rest(user, ["password_hash"]);
            return {
                user: userWithoutPassword,
                token
            };
        }
        catch (error) {
            console.error("Error logging in:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
// Get current user from token
function getCurrentUser(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
            // Find user by ID with statistics
            const userResult = yield conn.query(`SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
        u.display_name, u.bio, u.avatar_url, u.profile_banner_url, u.website,
        u.location, u.is_verified, u.status, u.cake_day, u.created_at, 
        u.updated_at, u.last_active,
        s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.id = ?`, [userId]);
            const [rows] = userResult;
            const user = rows[0];
            if (!user) {
                throw new Error('User not found');
            }
            // Update last_active timestamp
            yield conn.query("UPDATE user SET last_active = ? WHERE id = ?", [new Date(), userId]);
            return user;
        }
        catch (error) {
            console.error("Error getting current user:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
// Middleware to verify JWT token
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid token');
    }
}
// User logout
function logout(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Log activity
            yield (0, activity_1.logActivity)({
                userId,
                activityType: 'USER',
                actionType: 'LOGOUT',
                entityId: userId,
                entityType: 'user',
                metadata: null,
                ipAddress: undefined,
                userAgent: undefined
            });
            return { success: true };
        }
        catch (error) {
            console.error("Error logging out:", error);
            throw error;
        }
    });
}
