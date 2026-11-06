-- ==============================================================================
-- SPLITMATE DEMO SEED DATA (13-Person Goa Trip)
-- ==============================================================================

-- Insert 13 Demo Profiles (Linked to auth.users in production)
INSERT INTO public.profiles (id, full_name, avatar_url) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Aarav Sharma', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000002', 'Diya Patel', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000003', 'Ishaan Verma', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000004', 'Ananya Iyer', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000005', 'Rohan Gupta', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000006', 'Kavya Nair', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000007', 'Aditya Singh', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000008', 'Meera Rao', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000009', 'Kabir Mehta', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000010', 'Tanvi Desai', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000011', 'Vivaan Joshi', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000012', 'Sanya Kapoor', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop'),
  ('a0000000-0000-0000-0000-000000000013', 'Arjun Nambiar', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Insert Trip Group
INSERT INTO public.groups (id, name, description, group_type, currency, created_by)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Goa Vacation 2026',
  'Annual friend getaway — beaches, villas and water sports',
  'trip',
  'INR',
  'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Insert 13 Members
INSERT INTO public.group_members (group_id, user_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000012', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000013', 'member')
ON CONFLICT DO NOTHING;
