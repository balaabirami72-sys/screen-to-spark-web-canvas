CREATE FUNCTION public.save_bom(
  p_bom_id uuid,
  p_product_id uuid,
  p_expected_yield numeric,
  p_yield_unit text,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_bom_id uuid;
  recipe_line jsonb;
  ingredient_id uuid;
  ingredient_quantity numeric;
  ingredient_unit text;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'production'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed to save a BOM';
  END IF;

  IF p_expected_yield <= 0 OR btrim(p_yield_unit) = '' THEN
    RAISE EXCEPTION 'Expected yield and unit are required';
  END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'A BOM needs at least one ingredient';
  END IF;

  IF p_bom_id IS NULL THEN
    INSERT INTO public.boms (product_id, expected_yield, yield_unit)
    VALUES (p_product_id, p_expected_yield, p_yield_unit)
    RETURNING id INTO saved_bom_id;
  ELSE
    UPDATE public.boms
    SET product_id = p_product_id,
        expected_yield = p_expected_yield,
        yield_unit = p_yield_unit,
        updated_at = now()
    WHERE id = p_bom_id
    RETURNING id INTO saved_bom_id;
    IF saved_bom_id IS NULL THEN
      RAISE EXCEPTION 'BOM not found';
    END IF;
    DELETE FROM public.bom_lines WHERE bom_id = saved_bom_id;
  END IF;

  FOR recipe_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    ingredient_id := (recipe_line ->> 'item_id')::uuid;
    ingredient_quantity := (recipe_line ->> 'standard_quantity')::numeric;
    ingredient_unit := btrim(recipe_line ->> 'unit');

    IF ingredient_quantity <= 0 OR ingredient_unit = '' THEN
      RAISE EXCEPTION 'Ingredient quantities and units must be positive and present';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.items
      WHERE id = ingredient_id AND type IN ('raw', 'packaging')
    ) THEN
      RAISE EXCEPTION 'BOM ingredients must be raw or packaging items';
    END IF;

    INSERT INTO public.bom_lines (bom_id, item_id, standard_quantity, unit)
    VALUES (saved_bom_id, ingredient_id, ingredient_quantity, ingredient_unit);
  END LOOP;

  RETURN saved_bom_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_bom(uuid, uuid, numeric, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_bom(uuid, uuid, numeric, text, jsonb) TO authenticated, service_role;