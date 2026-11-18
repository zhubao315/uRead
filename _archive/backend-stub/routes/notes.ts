import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ResponseHelper } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock data for demonstration - in production, this would come from the database
let mockNotes: any[] = [
  {
    id: 'note-1',
    userId: 'user-1',
    bookId: 'book-1',
    type: 'highlight',
    content: 'This is a highlighted passage from the book.',
    position: 25,
    quote: 'This is a highlighted passage',
    color: '#ffeb3b',
    tags: ['important', 'key-concept'],
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all notes for a user
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const userNotes = mockNotes.filter(note => note.userId === userId);
  res.json(ResponseHelper.success(userNotes));
});

// Create a new note
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const { bookId, type, content, position, quote, color, tags } = req.body;

  if (!bookId || !type || !content) {
    return res.status(400).json(ResponseHelper.error('Missing required fields'));
  }

  const newNote = {
    id: uuidv4(),
    userId,
    bookId,
    type,
    content,
    position,
    quote,
    color,
    tags: tags || [],
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockNotes.push(newNote);
  res.status(201).json(ResponseHelper.success(newNote, 'Note created successfully'));
});

// Update a note
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const noteId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const noteIndex = mockNotes.findIndex(
    note => note.id === noteId && note.userId === userId
  );

  if (noteIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Note not found'));
  }

  const updatedNote = {
    ...mockNotes[noteIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockNotes[noteIndex] = updatedNote;
  res.json(ResponseHelper.success(updatedNote, 'Note updated successfully'));
});

// Delete a note
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const noteId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const noteIndex = mockNotes.findIndex(
    note => note.id === noteId && note.userId === userId
  );

  if (noteIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Note not found'));
  }

  mockNotes.splice(noteIndex, 1);
  res.json(ResponseHelper.success(null, 'Note deleted successfully'));
});

export default router;