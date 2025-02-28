import { Request, Response } from 'express';

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

export const getPosts = async (req: Request, res: Response) => {
  try {
    res.status(200).json(mockPosts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

export const getPost = async (req: Request, res: Response) => {
  try {
    const post = mockPosts.find(p => p.id === req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post' });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const newPost = {
      id: String(mockPosts.length + 1),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockPosts.push(newPost);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const postIndex = mockPosts.findIndex(p => p.id === req.params.id);
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const updatedPost = {
      ...mockPosts[postIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    mockPosts[postIndex] = updatedPost;
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const postIndex = mockPosts.findIndex(p => p.id === req.params.id);
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }

    mockPosts.splice(postIndex, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post' });
  }
};
