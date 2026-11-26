CREATE TYPE public.app_role AS ENUM ('salesman', 'admin', 'production', 'accountant', 'owner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_role_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_role_invites TO authenticated;
GRANT ALL ON public.staff_role_invites TO service_role;
ALTER TABLE public.staff_role_invites ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX staff_role_invites_email_open_idx ON public.staff_role_invites (lower(email)) WHERE claimed_at IS NULL;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles target_role
    WHERE target_role.user_id = _user_id
      AND target_role.role = _role
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.user_roles viewer_role
          WHERE viewer_role.user_id = auth.uid()
            AND viewer_role.role IN ('admin'::public.app_role, 'owner'::public.app_role)
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Users can read their own role and admins can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'owner')
);

CREATE POLICY "Admins and owners can manage role invites"
ON public.staff_role_invites FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'admin') AND role <> 'owner')
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner')
  OR (public.has_role(auth.uid(), 'admin') AND role <> 'owner')
);

CREATE TABLE public.price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_lists TO authenticated;
GRANT ALL ON public.price_lists TO service_role;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view price lists"
ON public.price_lists FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins manage price lists"
ON public.price_lists FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('raw', 'packaging', 'finished')),
  base_unit text NOT NULL,
  hsn_code text,
  gst_rate numeric(6, 3) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view items"
ON public.items FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins manage items"
ON public.items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id uuid NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  unit_price numeric(18, 4) NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (price_list_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_list_items TO authenticated;
GRANT ALL ON public.price_list_items TO service_role;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view price list items"
ON public.price_list_items FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins manage price list items"
ON public.price_list_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('retailer', 'distributor')),
  gstin text,
  state_code text NOT NULL,
  price_list_id uuid REFERENCES public.price_lists(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, state_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins, accountants, and owners can view customers"
ON public.customers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins and owners manage customers"
ON public.customers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  gstin text,
  state_code text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins manage suppliers"
ON public.suppliers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit text NOT NULL,
  to_unit text NOT NULL,
  multiplier numeric(20, 6) NOT NULL CHECK (multiplier > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_unit, to_unit)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_conversions TO authenticated;
GRANT ALL ON public.unit_conversions TO service_role;
ALTER TABLE public.unit_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view unit conversions"
ON public.unit_conversions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins manage unit conversions"
ON public.unit_conversions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.boms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.items(id) ON DELETE RESTRICT,
  expected_yield numeric(20, 4) NOT NULL CHECK (expected_yield > 0),
  yield_unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boms TO authenticated;
GRANT ALL ON public.boms TO service_role;
ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view BOMs"
ON public.boms FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins and production manage BOMs"
ON public.boms FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id uuid NOT NULL REFERENCES public.boms(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  standard_quantity numeric(20, 4) NOT NULL CHECK (standard_quantity > 0),
  unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bom_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bom_lines TO authenticated;
GRANT ALL ON public.bom_lines TO service_role;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view BOM lines"
ON public.bom_lines FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins and production manage BOM lines"
ON public.bom_lines FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  variance_tolerance numeric(6, 3) NOT NULL DEFAULT 3 CHECK (variance_tolerance >= 0),
  home_state_code text NOT NULL DEFAULT '33',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view settings"
ON public.settings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins and owners manage settings"
ON public.settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  batch_no text,
  quantity numeric(20, 4) NOT NULL CHECK (quantity <> 0),
  rate numeric(18, 4) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  source_type text NOT NULL CHECK (source_type IN ('opening_balance', 'adjustment', 'purchase', 'production', 'invoice', 'credit_note')),
  source_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Factory roles can view stock movements"
ON public.stock_movements FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);
CREATE POLICY "Admins and production can post stock adjustments"
ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (
  source_type = 'adjustment'
  AND created_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production'))
);
CREATE INDEX stock_movements_item_created_at_idx ON public.stock_movements (item_id, created_at DESC);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins accountants and owners can read audit records"
ON public.audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'owner')
);

CREATE VIEW public.stock_balance_summary WITH (security_invoker = true) AS
SELECT
  i.id AS item_id,
  i.name AS item_name,
  i.type AS item_type,
  i.base_unit,
  COALESCE(SUM(sm.quantity), 0)::numeric(20, 4) AS balance,
  COUNT(sm.id)::bigint AS movement_count
FROM public.items i
LEFT JOIN public.stock_movements sm ON sm.item_id = i.id
GROUP BY i.id, i.name, i.type, i.base_unit;
GRANT SELECT ON public.stock_balance_summary TO authenticated;

INSERT INTO public.price_lists (name) VALUES ('Standard');

INSERT INTO public.items (name, type, base_unit, hsn_code, gst_rate) VALUES
  ('Flour', 'raw', 'kg', NULL, 0),
  ('Cooking oil', 'raw', 'L', NULL, 0),
  ('Salt & spice mix', 'raw', 'kg', NULL, 0),
  ('200 g pouch', 'packaging', 'piece', NULL, 0),
  ('Carton holding 20 packets', 'packaging', 'piece', NULL, 0),
  ('Murukku 200 g', 'finished', 'packet', '1905', 5);

INSERT INTO public.price_list_items (price_list_id, item_id, unit_price)
SELECT pl.id, i.id, 50
FROM public.price_lists pl
CROSS JOIN public.items i
WHERE pl.name = 'Standard' AND i.name = 'Murukku 200 g';

INSERT INTO public.customers (name, type, gstin, state_code, price_list_id)
SELECT 'Retailer A', 'retailer', '33TEST00000A1Z5', '33', pl.id
FROM public.price_lists pl
WHERE pl.name = 'Standard';
INSERT INTO public.customers (name, type, gstin, state_code, price_list_id)
SELECT 'Distributor B', 'distributor', '29TEST00000A1Z5', '29', pl.id
FROM public.price_lists pl
WHERE pl.name = 'Standard';

INSERT INTO public.unit_conversions (from_unit, to_unit, multiplier) VALUES
  ('kg', 'g', 1000),
  ('L', 'mL', 1000),
  ('carton', 'packet', 20);

INSERT INTO public.boms (product_id, expected_yield, yield_unit)
SELECT id, 200, 'packet' FROM public.items WHERE name = 'Murukku 200 g';
INSERT INTO public.bom_lines (bom_id, item_id, standard_quantity, unit)
SELECT b.id, i.id, seed.standard_quantity, seed.unit
FROM public.boms b
JOIN public.items product ON product.id = b.product_id AND product.name = 'Murukku 200 g'
CROSS JOIN (VALUES
  ('Flour', 40::numeric, 'kg'),
  ('Cooking oil', 10::numeric, 'L'),
  ('Salt & spice mix', 1.2::numeric, 'kg'),
  ('200 g pouch', 200::numeric, 'piece'),
  ('Carton holding 20 packets', 10::numeric, 'piece')
) AS seed(item_name, standard_quantity, unit)
JOIN public.items i ON i.name = seed.item_name;

INSERT INTO public.settings (singleton, variance_tolerance, home_state_code)
VALUES (true, 3, '33');

INSERT INTO public.stock_movements (item_id, quantity, rate, source_type)
SELECT id, seed.quantity, seed.rate, 'opening_balance'
FROM (VALUES
  ('Flour', 100::numeric, 42::numeric),
  ('Cooking oil', 30::numeric, 140::numeric),
  ('Salt & spice mix', 5::numeric, 200::numeric),
  ('200 g pouch', 500::numeric, 2.50::numeric),
  ('Carton holding 20 packets', 30::numeric, 15::numeric),
  ('Murukku 200 g', 50::numeric, 0::numeric)
) AS seed(item_name, quantity, rate)
JOIN public.items i ON i.name = seed.item_name;