DROP POLICY "Admins manage price lists" ON public.price_lists;
CREATE POLICY "Admins and owners can insert price lists" ON public.price_lists FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update price lists" ON public.price_lists FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete price lists" ON public.price_lists FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins manage items" ON public.items;
CREATE POLICY "Admins and owners can insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update items" ON public.items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete items" ON public.items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins manage price list items" ON public.price_list_items;
CREATE POLICY "Admins and owners can insert price list items" ON public.price_list_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update price list items" ON public.price_list_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete price list items" ON public.price_list_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins and owners manage customers" ON public.customers;
CREATE POLICY "Admins and owners can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins manage suppliers" ON public.suppliers;
CREATE POLICY "Admins and owners can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins manage unit conversions" ON public.unit_conversions;
CREATE POLICY "Admins and owners can insert unit conversions" ON public.unit_conversions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update unit conversions" ON public.unit_conversions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete unit conversions" ON public.unit_conversions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins and production manage BOMs" ON public.boms;
CREATE POLICY "Admins and production can insert BOMs" ON public.boms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and production can update BOMs" ON public.boms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and production can delete BOMs" ON public.boms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins and production manage BOM lines" ON public.bom_lines;
CREATE POLICY "Admins and production can insert BOM lines" ON public.bom_lines FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and production can update BOM lines" ON public.bom_lines FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and production can delete BOM lines" ON public.bom_lines FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'production') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY "Admins and owners manage settings" ON public.settings;
CREATE POLICY "Admins and owners can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can update settings" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Admins and owners can delete settings" ON public.settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX bom_lines_item_id_idx ON public.bom_lines (item_id);
CREATE INDEX customers_price_list_id_idx ON public.customers (price_list_id);
CREATE INDEX price_list_items_item_id_idx ON public.price_list_items (item_id);
ALTER FUNCTION public.save_bom(uuid, uuid, numeric, text, jsonb) SECURITY INVOKER;