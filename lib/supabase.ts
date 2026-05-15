import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 실시간 게시글 구독 함수 예시
 */
export const subscribeToPosts = (callback: (payload: any) => void) => {
  return supabase
    .channel('public:posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, callback)
    .subscribe();
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
 * 좋아요 증가 함수
 */
export const likePost = async (userId: string, postId: string) => {
  const { error } = await supabase
    .from('likes')
    .insert([{ user_id: userId, post_id: postId }]);
  
  if (error) throw error;
};
