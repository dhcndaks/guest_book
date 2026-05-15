'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Bell, Heart, Send } from 'lucide-react';

// Types based on DB Schema
interface Post {
  id: string;
  user_id: string;
  author_name: string;
  content: string;
  likes_count: number;
  created_at: string;
  avatar_url: string;
}

export default function GuestbookPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Initial Mock Data
  useEffect(() => {
    const mockPosts: Post[] = [
      {
        id: '1',
        user_id: 'user1',
        author_name: '홍길동',
        content: '안녕하세요! 새로운 프로젝트 시작해서 너무 기대돼요 🚀\n모두 화이팅!',
        likes_count: 12,
        created_at: '2025.05.20',
        avatar_url: 'https://i.pravatar.cc/150?u=1'
      },
      {
        id: '2',
        user_id: 'user2',
        author_name: '김민지',
        content: '오늘 수업도 정말 재미있었어요!\n다음 프로젝트도 기대돼요 😊',
        likes_count: 8,
        created_at: '2025.05.20',
        avatar_url: 'https://i.pravatar.cc/150?u=2'
      },
      {
        id: '3',
        user_id: 'me',
        author_name: '이서준',
        content: '새로운 프로젝트 성공적이죠!\n선생님 감사합니다 🙌',
        likes_count: 15,
        created_at: '2025.05.19',
        avatar_url: 'https://i.pravatar.cc/150?u=3'
      }
    ];
    setPosts(mockPosts);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newPost: Post = {
      id: Date.now().toString(),
      user_id: 'me',
      author_name: '이서준', // Assuming logged in user
      content: inputValue,
      likes_count: 0,
      created_at: new Date().toLocaleDateString('ko-KR').replace(/-/g, '.').slice(0, -1),
      avatar_url: 'https://i.pravatar.cc/150?u=3'
    };

    setPosts([newPost, ...posts]);
    setInputValue('');
  };

  const filteredPosts = activeTab === 'all' 
    ? posts 
    : posts.filter(p => p.user_id === 'me');

  return (
    <div className="max-w-[600px] mx-auto min-h-screen bg-white flex flex-col relative shadow-sm">
      {/* Header */}
      <header className="flex justify-between items-center p-4 sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b">
        <button className="p-2"><Menu size={24} /></button>
        <h1 className="text-xl font-bold">우리 반 방명록</h1>
        <button className="p-2"><Bell size={24} /></button>
      </header>

      {/* Tabs */}
      <nav className="flex border-b">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 font-semibold transition-all relative ${activeTab === 'all' ? 'text-black' : 'text-gray-400'}`}
        >
          전체 글
          {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#ff4b2b] rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`flex-1 py-3 font-semibold transition-all relative ${activeTab === 'mine' ? 'text-black' : 'text-gray-400'}`}
        >
          내 글
          {activeTab === 'mine' && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#ff4b2b] rounded-t-full" />}
        </button>
      </nav>

      {/* List */}
      <main className="flex-1 p-4 space-y-4 pb-24">
        {filteredPosts.map((post) => (
          <article key={post.id} className="p-5 border rounded-2xl bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <img src={post.avatar_url} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
              <div>
                <div className="font-bold text-sm">{post.author_name}</div>
                <div className="text-xs text-gray-400">{post.created_at}</div>
              </div>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
            <div className="flex justify-end">
              <button className="flex items-center gap-1 text-gray-400 hover:text-[#ff4b2b] transition-colors">
                <Heart size={18} />
                <span className="text-sm">{post.likes_count}</span>
              </button>
            </div>
          </article>
        ))}
      </main>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] p-4 bg-white border-t flex gap-2 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-[#ff4b2b] transition-all outline-none"
        />
        <button type="submit" className="bg-[#ff4b2b] text-white p-3 rounded-full hover:scale-105 active:scale-95 transition-all">
          <Send size={20} />
        </button>
      </form>

      <style jsx>{`
        .animate-in {
          animation: slideUp 0.5s ease-out forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
