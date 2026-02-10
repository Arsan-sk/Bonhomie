-- ============================================
-- Feature Flags Schema
-- Controls which features are active/visible in the application
-- ============================================

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.feature_flags IS 'Stores feature flags to enable/disable features across the application';

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read feature flags (needed to determine what to show)
CREATE POLICY "Anyone can read feature flags"
    ON public.feature_flags
    FOR SELECT
    USING (true);

-- Only admins can update feature flags
CREATE POLICY "Only admins can update feature flags"
    ON public.feature_flags
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can insert feature flags
CREATE POLICY "Only admins can insert feature flags"
    ON public.feature_flags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete feature flags
CREATE POLICY "Only admins can delete feature flags"
    ON public.feature_flags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flags_updated_at();

-- Enable realtime for feature_flags table
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;

-- Insert initial feature flags
INSERT INTO public.feature_flags (feature_key, display_name, description, is_active) VALUES
    ('chat', 'Chat System', 'Real-time chat functionality for students, coordinators, and admins', true),
    ('zaika', 'Zaika Food Festival', 'Digital wallet and food stall management system for Zaika event', true),
    ('hot_topics', 'Hot Topics', 'Special events section including Zaika and other highlighted features', true),
    ('certificates', 'Certificates', 'Certificate generation and verification system', true),
    ('analytics', 'Analytics Dashboard', 'Analytics and reporting features for admins and coordinators', true)
ON CONFLICT (feature_key) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT SELECT ON public.feature_flags TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Feature flags table created successfully!';
    RAISE NOTICE '   - Table: feature_flags';
    RAISE NOTICE '   - RLS: Enabled (read: all, write: admin only)';
    RAISE NOTICE '   - Realtime: Enabled';
    RAISE NOTICE '   - Initial features: chat, zaika, hot_topics, certificates, analytics';
END $$;
