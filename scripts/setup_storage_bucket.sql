-- Create the inspection_photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection_photos', 'inspection_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'inspection_photos' );

-- Policy: Allow public to view photos (since they are embedded in reports)
CREATE POLICY "Public can view inspection photos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'inspection_photos' );

-- Policy: Allow users to delete their own photos (optional)
CREATE POLICY "Users can delete their own inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'inspection_photos' AND auth.uid() = owner );
