-- ==============================================================================
-- SPLITMATE ATOMIC FUNCTIONS & STORED PROCEDURES
-- Guarantees ACID transactions for expense creation, settlements and invitations
-- ==============================================================================

-- 1. ATOMIC EXPENSE CREATION
CREATE OR REPLACE FUNCTION public.create_expense_atomic(
    p_group_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_amount_minor BIGINT,
    p_currency TEXT,
    p_category TEXT,
    p_expense_date DATE,
    p_created_by UUID,
    p_receipt_url TEXT,
    p_payers JSONB, -- Array of { "user_id": UUID, "paid_amount_minor": BIGINT }
    p_splits JSONB  -- Array of { "user_id": UUID, "share_amount_minor": BIGINT, "split_type": TEXT }
)
RETURNS UUID AS $$
DECLARE
    v_expense_id UUID;
    v_payer RECORD;
    v_split RECORD;
    v_total_paid BIGINT := 0;
    v_total_split BIGINT := 0;
BEGIN
    -- Validation 1: User must be a member of the group
    IF NOT public.is_group_member(p_group_id, p_created_by) THEN
        RAISE EXCEPTION 'User % is not a member of group %', p_created_by, p_group_id;
    END IF;

    -- Validation 2: Sum of payers must equal amount
    FOR v_payer IN SELECT * FROM jsonb_to_recordset(p_payers) AS x(user_id UUID, paid_amount_minor BIGINT)
    LOOP
        v_total_paid := v_total_paid + v_payer.paid_amount_minor;
    END LOOP;

    IF v_total_paid <> p_amount_minor THEN
        RAISE EXCEPTION 'Total paid (%) does not match expense amount (%)', v_total_paid, p_amount_minor;
    END IF;

    -- Validation 3: Sum of splits must equal amount
    FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, share_amount_minor BIGINT, split_type TEXT)
    LOOP
        v_total_split := v_total_split + v_split.share_amount_minor;
    END LOOP;

    IF v_total_split <> p_amount_minor THEN
        RAISE EXCEPTION 'Total splits (%) does not match expense amount (%)', v_total_split, p_amount_minor;
    END IF;

    -- Insert expense
    INSERT INTO public.expenses (
        group_id, title, description, amount_minor, currency, category, expense_date, created_by, receipt_url
    ) VALUES (
        p_group_id, p_title, p_description, p_amount_minor, p_currency, p_category, p_expense_date, p_created_by, p_receipt_url
    ) RETURNING id INTO v_expense_id;

    -- Insert payers
    FOR v_payer IN SELECT * FROM jsonb_to_recordset(p_payers) AS x(user_id UUID, paid_amount_minor BIGINT)
    LOOP
        INSERT INTO public.expense_payers (expense_id, user_id, paid_amount_minor)
        VALUES (v_expense_id, v_payer.user_id, v_payer.paid_amount_minor);
    END LOOP;

    -- Insert splits
    FOR v_split IN SELECT * FROM jsonb_to_recordset(p_splits) AS x(user_id UUID, share_amount_minor BIGINT, split_type TEXT)
    LOOP
        INSERT INTO public.expense_splits (expense_id, user_id, share_amount_minor, split_type)
        VALUES (v_expense_id, v_split.user_id, v_split.share_amount_minor, v_split.split_type);
    END LOOP;

    -- Insert activity log
    INSERT INTO public.activity_logs (
        group_id, actor_id, action, entity_type, entity_id, metadata
    ) VALUES (
        p_group_id,
        p_created_by,
        'expense_created',
        'expense',
        v_expense_id,
        jsonb_build_object('title', p_title, 'amount_minor', p_amount_minor, 'category', p_category)
    );

    RETURN v_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATOMIC SETTLEMENT CONFIRMATION
CREATE OR REPLACE FUNCTION public.confirm_settlement_atomic(
    p_settlement_id UUID,
    p_confirmed_by UUID
)
RETURNS VOID AS $$
DECLARE
    v_settlement RECORD;
BEGIN
    SELECT * INTO v_settlement FROM public.settlements WHERE id = p_settlement_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Settlement % not found', p_settlement_id;
    END IF;

    IF v_settlement.status = 'confirmed' THEN
        RAISE EXCEPTION 'Settlement is already confirmed';
    END IF;

    IF v_settlement.receiver_id <> p_confirmed_by THEN
        -- Check if admin
        IF NOT EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = v_settlement.group_id AND user_id = p_confirmed_by AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Only the receiver or group admin can confirm this settlement';
        END IF;
    END IF;

    UPDATE public.settlements
    SET status = 'confirmed',
        confirmed_at = timezone('utc'::text, now()),
        confirmed_by = p_confirmed_by
    WHERE id = p_settlement_id;

    -- Insert activity log
    INSERT INTO public.activity_logs (
        group_id, actor_id, action, entity_type, entity_id, metadata
    ) VALUES (
        v_settlement.group_id,
        p_confirmed_by,
        'settlement_confirmed',
        'settlement',
        p_settlement_id,
        jsonb_build_object('amount_minor', v_settlement.amount_minor, 'payer_id', v_settlement.payer_id, 'receiver_id', v_settlement.receiver_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. JOIN GROUP VIA INVITATION TOKEN
CREATE OR REPLACE FUNCTION public.join_group_via_token(
    p_token_hash TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    SELECT * INTO v_invitation
    FROM public.group_invitations
    WHERE token_hash = p_token_hash
      AND revoked_at IS NULL
      AND expires_at > timezone('utc'::text, now());

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Check if already member
    IF EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id = v_invitation.group_id AND user_id = p_user_id
    ) THEN
        RETURN v_invitation.group_id;
    END IF;

    -- Insert membership
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (v_invitation.group_id, p_user_id, 'member');

    -- Insert activity log
    INSERT INTO public.activity_logs (
        group_id, actor_id, action, entity_type, entity_id, metadata
    ) VALUES (
        v_invitation.group_id,
        p_user_id,
        'member_joined',
        'user',
        p_user_id,
        jsonb_build_object('method', 'invitation_link')
    );

    RETURN v_invitation.group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
