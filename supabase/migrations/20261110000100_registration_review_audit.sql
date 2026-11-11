-- ============================================================
-- Brainy US
-- Migration: Registration Review Audit
-- Purpose: Preserve an audit trail of registration decisions.
-- ============================================================

BEGIN;

-- 1. Create the audit history table.
CREATE TABLE IF NOT EXISTS public.registration_review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    registration_id UUID
        REFERENCES public.registrations(id)
        ON DELETE SET NULL,

    -- Preserve these identifiers even if the registration is deleted.
    battle_id UUID NOT NULL,
    player_id UUID NOT NULL,

    admin_id UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    old_status TEXT,
    new_status TEXT,

    old_payment_status TEXT,
    new_payment_status TEXT,

    admin_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.registration_review_logs IS
'Immutable audit history of registration and payment status changes.';

-- 2. Add indexes for audit history queries.
CREATE INDEX IF NOT EXISTS idx_registration_review_logs_registration
    ON public.registration_review_logs(registration_id);

CREATE INDEX IF NOT EXISTS idx_registration_review_logs_battle
    ON public.registration_review_logs(battle_id);

CREATE INDEX IF NOT EXISTS idx_registration_review_logs_created
    ON public.registration_review_logs(created_at DESC);

-- 3. Enable Row Level Security.
ALTER TABLE public.registration_review_logs
    ENABLE ROW LEVEL SECURITY;

-- 4. Only administrators can read audit history.
CREATE POLICY "Admins can view registration review logs"
ON public.registration_review_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
    )
);

-- 5. Prevent direct client writes to the audit table.
REVOKE ALL PRIVILEGES
ON TABLE public.registration_review_logs
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.registration_review_logs
TO authenticated;

-- 6. Automatically record registration review changes.
CREATE OR REPLACE FUNCTION public.log_registration_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_action TEXT;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    THEN
        v_action := CASE
            WHEN NEW.status IS DISTINCT FROM OLD.status
                 AND NEW.payment_status IS DISTINCT FROM OLD.payment_status
                THEN 'review_updated'

            WHEN NEW.status IS DISTINCT FROM OLD.status
                 AND NEW.status = 'approved'
                THEN 'registration_approved'

            WHEN NEW.status IS DISTINCT FROM OLD.status
                 AND NEW.status = 'rejected'
                THEN 'registration_rejected'

            WHEN NEW.payment_status IS DISTINCT FROM OLD.payment_status
                 AND NEW.payment_status = 'verified'
                THEN 'payment_verified'

            WHEN NEW.payment_status IS DISTINCT FROM OLD.payment_status
                 AND NEW.payment_status = 'rejected'
                THEN 'payment_rejected'

            ELSE 'review_updated'
        END;

        INSERT INTO public.registration_review_logs (
            registration_id,
            battle_id,
            player_id,
            admin_id,
            action,
            old_status,
            new_status,
            old_payment_status,
            new_payment_status,
            admin_note
        )
        VALUES (
            NEW.id,
            NEW.battle_id,
            NEW.player_id,
            COALESCE(auth.uid(), NEW.reviewed_by),
            v_action,
            OLD.status,
            NEW.status,
            OLD.payment_status,
            NEW.payment_status,
            NEW.admin_note
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- Prevent direct execution of the trigger function by API roles.
REVOKE ALL ON FUNCTION public.log_registration_review_change()
FROM PUBLIC, anon, authenticated;

-- 7. Attach the audit trigger.
DROP TRIGGER IF EXISTS registrations_audit_review_changes
ON public.registrations;

CREATE TRIGGER registrations_audit_review_changes
AFTER UPDATE ON public.registrations
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
)
EXECUTE FUNCTION public.log_registration_review_change();

COMMIT;
