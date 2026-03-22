-- ===========================================================
-- CropWise Database Schema
-- Run this in Supabase SQL Editor (after profiles table is created)
-- ===========================================================

-- NOTE: profiles table + policies + handle_new_user trigger
-- should already exist from initial setup. If not, run this first:
--
-- CREATE TABLE IF NOT EXISTS public.profiles (
--   id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
--   email TEXT UNIQUE NOT NULL,
--   full_name TEXT,
--   region TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
-- );

-- ===========================================================
-- 1. Yield Predictions History
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.yield_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Input fields
  crop TEXT NOT NULL,
  crop_year INTEGER NOT NULL,
  season TEXT NOT NULL,
  state TEXT NOT NULL,
  area REAL NOT NULL,
  annual_rainfall REAL NOT NULL,
  fertilizer REAL NOT NULL,
  pesticide REAL NOT NULL,

  -- Result fields
  predicted_yield REAL,
  confidence REAL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.yield_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own yield predictions"
  ON public.yield_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own yield predictions"
  ON public.yield_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===========================================================
-- 2. Disease Detections History
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.disease_detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Image stored in S3/Supabase Storage, URL saved here
  image_url TEXT,

  -- Result fields
  disease_name TEXT,
  disease_key TEXT,
  confidence REAL,
  risk_level TEXT,
  model_used TEXT,
  description TEXT,
  treatment TEXT,
  prevention TEXT,
  language TEXT DEFAULT 'en',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.disease_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own disease detections"
  ON public.disease_detections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disease detections"
  ON public.disease_detections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===========================================================
-- 3. Fertilizer Recommendations History
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.fertilizer_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- Input fields
  nitrogen REAL NOT NULL,
  phosphorus REAL NOT NULL,
  potassium REAL NOT NULL,
  crop_name TEXT NOT NULL,

  -- Result fields
  recommended_fertilizer TEXT,
  description TEXT,
  dosage TEXT,
  npk_analysis TEXT[],
  language TEXT DEFAULT 'en',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

ALTER TABLE public.fertilizer_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fertilizer recommendations"
  ON public.fertilizer_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===========================================================
-- 4. Storage Bucket for Disease Images (optional - for S3-like storage)
-- ===========================================================
-- If you want to use Supabase Storage instead of S3:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('disease-images', 'disease-images', false);
--
-- CREATE POLICY "Users can upload disease images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'disease-images' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own disease images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'disease-images' AND auth.uid()::text = (storage.foldername(name))[1]);
