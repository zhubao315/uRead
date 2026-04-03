// Core entity types for uRead

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishYear?: number;
  coverUrl?: string;
  description?: string;
  pages?: number;
  language: string;
  status: 'reading' | 'completed' | 'wishlist';
  rating?: number; // 1-5 stars
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  userId: string;
  bookId: string;
  type: 'highlight' | 'note' | 'summary';
  content: string;
  position?: number; // page number or character position
  quote?: string; // highlighted text
  color?: string; // highlight color
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookList {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'personal' | 'curated' | 'shared';
  books: string[]; // book IDs
  tags: string[];
  isPublic: boolean;
  collaborators: string[]; // user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeCard {
  id: string;
  userId: string;
  sourceBookId: string;
  sourceNoteId?: string;
  title: string;
  content: string;
  type: 'concept' | 'fact' | 'quote' | 'idea';
  category: string;
  tags: string[];
  relatedCards: string[]; // card IDs
  metadata: {
    difficulty?: 'easy' | 'medium' | 'hard';
    importance?: 'low' | 'medium' | 'high';
    sourcePage?: number;
    confidence?: number; // AI confidence score 0-1
  };
  isTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}