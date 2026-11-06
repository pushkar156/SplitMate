-- ==============================================================================
-- SPLITMATE DATABASE SCHEMA MIGRATION
-- Production PostgreSQL schema for group expense sharing and debt simplification
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Linked to Supabase Auth users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to create profile when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. GROUPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    group_type TEXT NOT NULL DEFAULT 'trip' CHECK (group_type IN ('trip', 'home', 'couple', 'event', 'other')),
    currency TEXT NOT NULL DEFAULT 'INR',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. GROUP MEMBERS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_group_user UNIQUE(group_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. GROUP INVITATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. EXPENSES TABLE
-- Minor currency units (e.g., paise) stored as BIGINT to eliminate floating point issues
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    category TEXT NOT NULL DEFAULT 'Other',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 6. EXPENSE PAYERS TABLE
-- Multiple payers support
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    paid_amount_minor BIGINT NOT NULL CHECK (paid_amount_minor > 0),
    CONSTRAINT unique_expense_payer UNIQUE(expense_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 7. EXPENSE SPLITS TABLE
-- Individual split breakdown
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    share_amount_minor BIGINT NOT NULL CHECK (share_amount_minor >= 0),
    split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_expense_split_participant UNIQUE(expense_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 8. SETTLEMENTS TABLE
-- Records off-platform cash/UPI/bank settlements between members
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('recorded', 'pending', 'confirmed', 'rejected')),
    note TEXT,
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT chk_payer_receiver_different CHECK (payer_id <> receiver_id)
);

-- ------------------------------------------------------------------------------
-- 9. ACTIVITY LOGS TABLE
-- Audit trail of all significant group events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON public.expenses(group_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_payers_expense ON public.expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_group ON public.activity_logs(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.group_invitations(token_hash) WHERE revoked_at IS NULL;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is user a member of group?
CREATE OR REPLACE FUNCTION public.is_group_member(lookup_group_id UUID, lookup_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = lookup_group_id AND user_id = lookup_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Authenticated users can view profiles
CREATE POLICY "Profiles readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Groups: Members can view groups they belong to
CREATE POLICY "Group members can view groups"
    ON public.groups FOR SELECT
    TO authenticated
    USING (
        id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR created_by = auth.uid()
    );

CREATE POLICY "Authenticated users can create groups"
    ON public.groups FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
    ON public.groups FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- Group Members: Members can view fellow members
CREATE POLICY "Members can view members of their groups"
    ON public.group_members FOR SELECT
    TO authenticated
    USING (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins or self can manage group members"
    ON public.group_members FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = group_members.group_id AND user_id = auth.uid() AND role = 'admin'
        )
        OR user_id = auth.uid()
    );

-- Expenses: Group members can view and create
CREATE POLICY "Members can view expenses in their groups"
    ON public.expenses FOR SELECT
    TO authenticated
    USING (
        public.is_group_member(group_id, auth.uid()) AND deleted_at IS NULL
    );

CREATE POLICY "Members can create expenses in their groups"
    ON public.expenses FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_group_member(group_id, auth.uid())
    );

CREATE POLICY "Creator or admins can update expenses"
    ON public.expenses FOR UPDATE
    TO authenticated
    USING (
        public.is_group_member(group_id, auth.uid()) AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.group_members
                WHERE group_id = expenses.group_id AND user_id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Expense Payers & Splits
CREATE POLICY "Members can view expense payers"
    ON public.expense_payers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_payers.expense_id
            AND public.is_group_member(expenses.group_id, auth.uid())
        )
    );

CREATE POLICY "Members can insert expense payers"
    ON public.expense_payers FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_payers.expense_id
            AND public.is_group_member(expenses.group_id, auth.uid())
        )
    );

CREATE POLICY "Members can view expense splits"
    ON public.expense_splits FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_splits.expense_id
            AND public.is_group_member(expenses.group_id, auth.uid())
        )
    );

CREATE POLICY "Members can insert expense splits"
    ON public.expense_splits FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses
            WHERE expenses.id = expense_splits.expense_id
            AND public.is_group_member(expenses.group_id, auth.uid())
        )
    );

-- Settlements: Members can view, create, and confirm settlements
CREATE POLICY "Members can view settlements"
    ON public.settlements FOR SELECT
    TO authenticated
    USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can record settlements"
    ON public.settlements FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_group_member(group_id, auth.uid())
        AND payer_id = auth.uid()
    );

CREATE POLICY "Receivers or admins can update settlements"
    ON public.settlements FOR UPDATE
    TO authenticated
    USING (
        receiver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = settlements.group_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- Activity Logs: Members can view logs
CREATE POLICY "Members can view group activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can append group activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_group_member(group_id, auth.uid()));

-- Invitations
CREATE POLICY "Members can view group invitations"
    ON public.group_invitations FOR SELECT
    TO authenticated
    USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Admins can create group invitations"
    ON public.group_invitations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = group_invitations.group_id AND user_id = auth.uid() AND role = 'admin'
        )
    );
