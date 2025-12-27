-- Add address columns to inspection_photos table for administrative geotagging

ALTER TABLE public.inspection_photos
ADD COLUMN IF NOT EXISTS address_full text,
ADD COLUMN IF NOT EXISTS administrative_area text, -- Province/State
ADD COLUMN IF NOT EXISTS sub_administrative_area text, -- Regency/City
ADD COLUMN IF NOT EXISTS locality text, -- District/Kecamatan
ADD COLUMN IF NOT EXISTS thoroughfare text; -- Street name

-- Comment on columns for clarity
COMMENT ON COLUMN public.inspection_photos.address_full IS 'Full formatted address from reverse geocoding';
COMMENT ON COLUMN public.inspection_photos.administrative_area IS 'Province or State level';
COMMENT ON COLUMN public.inspection_photos.sub_administrative_area IS 'City or Regency level';
COMMENT ON COLUMN public.inspection_photos.locality IS 'District or Kecamatan level';
