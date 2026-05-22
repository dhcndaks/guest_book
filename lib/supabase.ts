import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 게시글 목록 조회 함수 (profiles 테이블 JOIN)
 */
export const fetchPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      likes_count,
      created_at,
      user_id,
      profiles (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((post: any) => ({
    id: post.id,
    user_id: post.user_id,
    author_name: post.profiles?.name || '익명 학생',
    avatar_url: post.profiles?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.user_id}`,
    content: post.content,
    likes_count: post.likes_count || 0,
    created_at: new Date(post.created_at).toLocaleDateString('ko-KR').replace(/-/g, '.').slice(0, -1),
  }));
};

/**
 * 사용자가 좋아요한 게시글 ID 목록 조회 함수
 */
export const fetchUserLikedPostIds = async (userId: string) => {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((like: any) => like.post_id);
};

/**
 * 실시간 변경 사항 구독 함수 (posts 및 likes 변경 감지용)
 */
export const subscribeToChanges = (callback: () => void) => {
  const postsSubscription = supabase
    .channel('public:changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(postsSubscription);
  };
};

/**
 * 게시글 작성 함수
 */
export const createPost = async (userId: string, content: string) => {
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id: userId, content }])
    .select();
  
  if (error) throw error;
  return data;
};

/**
 * 좋아요 추가 함수
 */
export const likePost = async (userId: string, postId: string) => {
  const { error } = await supabase
    .from('likes')
    .insert([{ user_id: userId, post_id: postId }]);
  
  if (error) throw error;
};

/**
 * 좋아요 취소 함수
 */
export const unlikePost = async (userId: string, postId: string) => {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
};

