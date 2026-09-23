-- 1. Create Multi-Tenant Organization Structure
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.users_org_mapping (
    user_id UUID NOT NULL, -- References auth.users
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, organization_id)
);

-- 2. Link Projects to Owners and Tenants
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID NOT NULL, -- Points to auth.users
    raw_idea TEXT NOT NULL,
    audience_mode TEXT CHECK (audience_mode IN ('expert', 'student')) DEFAULT 'expert' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Store Execution Pipeline Steps securely
CREATE TABLE public.pipeline_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    step_number INT NOT NULL,
    task_name TEXT NOT NULL,
    assigned_engine TEXT NOT NULL,
    dependencies INT[] DEFAULT '{}'::INT[] NOT NULL,
    aider_config JSONB DEFAULT NULL,
    media_config JSONB DEFAULT NULL,
    pedagogical_hint TEXT DEFAULT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE (project_id, step_number)
);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_org_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization mappings"
ON public.users_org_mapping
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Establish Tenant Separation Policies (Example for Projects)
CREATE POLICY "Users can only interact with their organization's projects"
ON public.projects
FOR ALL
TO authenticated
USING (
    organization_id = (SELECT organization_id FROM public.users_org_mapping WHERE user_id = auth.uid())
);
