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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePost = exports.updatePost = exports.createPost = exports.getPost = exports.getPosts = void 0;
let mockPosts = [
    {
        id: '1',
        title: 'First Post',
        content: 'This is the first post',
        authorId: '1',
        communityId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'Second Post',
        content: 'This is the second post',
        authorId: '2',
        communityId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
const getPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json(mockPosts);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching posts' });
    }
});
exports.getPosts = getPosts;
const getPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const post = mockPosts.find(p => p.id === req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching post' });
    }
});
exports.getPost = getPost;
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newPost = Object.assign(Object.assign({ id: String(mockPosts.length + 1) }, req.body), { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        mockPosts.push(newPost);
        res.status(201).json(newPost);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating post' });
    }
});
exports.createPost = createPost;
const updatePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postIndex = mockPosts.findIndex(p => p.id === req.params.id);
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        const updatedPost = Object.assign(Object.assign(Object.assign({}, mockPosts[postIndex]), req.body), { updatedAt: new Date().toISOString() });
        mockPosts[postIndex] = updatedPost;
        res.status(200).json(updatedPost);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating post' });
    }
});
exports.updatePost = updatePost;
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postIndex = mockPosts.findIndex(p => p.id === req.params.id);
        if (postIndex === -1) {
            return res.status(404).json({ message: 'Post not found' });
        }
        mockPosts.splice(postIndex, 1);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting post' });
    }
});
exports.deletePost = deletePost;
