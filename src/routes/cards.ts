import { Router } from 'express';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ResponseHelper } from '../utils/response';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock data for demonstration
let mockKnowledgeCards: any[] = [
  {
    id: 'card-1',
    userId: 'user-1',
    sourceBookId: 'book-1',
    title: 'SOLID Principles',
    content: 'SOLID is an acronym for the first five object-oriented design principles by Robert C. Martin.',
    type: 'concept',
    category: 'Software Engineering',
    tags: ['programming', 'design-patterns', 'architecture'],
    relatedCards: [],
    metadata: {
      difficulty: 'medium',
      importance: 'high',
      confidence: 0.95
    },
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all knowledge cards for a user
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const userCards = mockKnowledgeCards.filter(card => card.userId === userId);
  res.json(ResponseHelper.success(userCards));
});

// Create a new knowledge card
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const { sourceBookId, title, content, type, category, tags } = req.body;

  if (!sourceBookId || !title || !content) {
    return res.status(400).json(ResponseHelper.error('Missing required fields'));
  }

  const newCard = {
    id: uuidv4(),
    userId,
    sourceBookId,
    title,
    content,
    type,
    category,
    tags: tags || [],
    relatedCards: [],
    metadata: {},
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockKnowledgeCards.push(newCard);
  res.status(201).json(ResponseHelper.success(newCard, 'Knowledge card created successfully'));
});

// Update a knowledge card
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const cardId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const cardIndex = mockKnowledgeCards.findIndex(
    card => card.id === cardId && card.userId === userId
  );

  if (cardIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Knowledge card not found'));
  }

  const updatedCard = {
    ...mockKnowledgeCards[cardIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockKnowledgeCards[cardIndex] = updatedCard;
  res.json(ResponseHelper.success(updatedCard, 'Knowledge card updated successfully'));
});

// Delete a knowledge card
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const cardId = req.params.id;

  if (!userId) {
    return res.status(401).json(ResponseHelper.error('Unauthorized'));
  }

  const cardIndex = mockKnowledgeCards.findIndex(
    card => card.id === cardId && card.userId === userId
  );

  if (cardIndex === -1) {
    return res.status(404).json(ResponseHelper.error('Knowledge card not found'));
  }

  mockKnowledgeCards.splice(cardIndex, 1);
  res.json(ResponseHelper.success(null, 'Knowledge card deleted successfully'));
});

export default router;