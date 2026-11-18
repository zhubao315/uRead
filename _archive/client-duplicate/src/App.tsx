import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './views/Dashboard';
import NotesView from './views/NotesView';
import BookListsView from './views/BookListsView';
import CardsView from './views/CardsView';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<NotesView />} />
          <Route path="/booklists" element={<BookListsView />} />
          <Route path="/cards" element={<CardsView />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;