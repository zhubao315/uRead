import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ResponseHelper } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock data for demonstration
let mockBookLists: any[] = [
  {
    id: 'booklist-1',
    userId: 'user-1',
    title: 'My Programming Books',
    description: 'Essential programming books for developers',
    type: 'personal',
    books: ['book-1', 'book-2'],
    tags: ['programming', 'development'],
    isPublic: false,
    collaborators: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all book lists for a user
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const userBookLists = mockBookLists.filter(list => list.userId === userId);
  res.json(ResponseHelper.success(userBookLists));
});

// Create a new book list
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const { title, description, type, books, tags } = req.body;

  if (!title || !type) {
    return res.status(400).json(ResponseHelper.error('Missing required fields'));
  }

  const newBookList = {
    id: uuidv4(),
    userId,
    title,
    description,
    type,
    books: books || [],
    tags: tags || [],
    isPublic: false,
    collaborators: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockBookLists.push(newBookList);
  res.status(201).json(ResponseHelper.success(newBookList, 'Book list created successfully'));
});

// Update a book list
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const bookListId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const listIndex = mockBookLists.findIndex(
    list => list.id === bookListId && list.userId === userId
  );

  if (listIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Book list not found'));
  }

  const updatedList = {
    ...mockBookLists[listIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockBookLists[listIndex] = updatedList;
  res.json(ResponseHelper.success(updatedList, 'Book list updated successfully'));
});

// Delete a book list
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const bookListId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const listIndex = mockBookLists.findIndex(
    list => list.id === bookListId && list.userId === userId
  );

  if (listIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Book list not found'));
  }

  mockBookLists.splice(listIndex, 1);
  res.json(ResponseHelper.success(null, 'Book list deleted successfully'));
});

export default router;