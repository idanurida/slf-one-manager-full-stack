// FILE: scripts/uploadTestFile.js
require('dotenv').config(); // Load environment variables

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload test file to Supabase Storage
 */
const uploadTestFile = async (fileName = 'test-document.txt') => {
  try {
    console.log('🚀 Starting test file upload...');
    console.log('📁 Supabase URL:', supabaseUrl);
    
    // Create test content
    const content = `Test Document for SLF Manager
Created: ${new Date().toISOString()}
This is a sample document for testing purposes.`;

    // Create a temporary file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);
    console.log('📄 Test file created:', filePath);

    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'text/plain' });

    // Upload to Supabase Storage
    const storagePath = `test-documents/${fileName}`;
    console.log('📤 Uploading to:', storagePath);

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBlob, {
        cacheControl: '3600',
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error('❌ Upload error:', error);
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('bucket') || error.message.includes('not found')) {
        console.log('🔄 Bucket might not exist, checking...');
        await checkAndCreateBucket();
        // Retry upload after bucket check
        return await uploadTestFile(fileName);
      }
      
      throw error;
    }

    console.log('✅ File uploaded successfully!');
    console.log('📊 Upload data:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    console.log('🔗 Public URL:', urlData.publicUrl);

    // Clean up temporary file
    fs.unlinkSync(filePath);
    console.log('🧹 Temporary file cleaned up');

    return {
      success: true,
      data: data,
      publicUrl: urlData.publicUrl,
      storagePath: storagePath
    };

  } catch (error) {
    console.error('💥 Upload failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if bucket exists and create if needed
 */
const checkAndCreateBucket = async () => {
  try {
    console.log('🔍 Checking bucket existence...');
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Error listing buckets:', error);
      return false;
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    if (documentsBucket) {
      console.log('✅ Bucket "documents" exists');
      return true;
    } else {
      console.log('📦 Bucket "documents" not found, creating...');
      
      // Note: Bucket creation might require service role key
      // This is a simplified version - in practice you might need to create buckets via Supabase dashboard
      console.log('⚠️  Please create the "documents" bucket manually in Supabase Dashboard:');
      console.log('   1. Go to Storage in your Supabase dashboard');
      console.log('   2. Click "New Bucket"');
      console.log('   3. Name it "documents"');
      console.log('   4. Set to public if needed');
      
      return false;
    }
  } catch (error) {
    console.error('❌ Bucket check failed:', error);
    return false;
  }
};

/**
 * List files in documents bucket
 */
const listFilesInBucket = async () => {
  try {
    console.log('📋 Listing files in bucket...');
    
    const { data, error } = await supabase.storage
      .from('documents')
      .list('');
    
    if (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }

    console.log(`📁 Found ${data.length} files:`);
    data.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name} (${file.id})`);
    });

    return data;
  } catch (error) {
    console.error('❌ List files failed:', error);
    return [];
  }
};

/**
 * Update database record with the uploaded file
 */
const updateDatabaseRecord = async (documentId, storagePath, publicUrl) => {
  try {
    console.log('💾 Updating database record...');
    
    const { data, error } = await supabase
      .from('documents')
      .update({
        url: storagePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select();

    if (error) {
      console.error('❌ Database update error:', error);
      return false;
    }

    console.log('✅ Database updated successfully:', data);
    return true;
  } catch (error) {
    console.error('❌ Database update failed:', error);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('🎯 SLF Manager - Test File Upload Script');
  console.log('=========================================\n');

  // 1. List existing files
  await listFilesInBucket();

  // 2. Upload test file
  const result = await uploadTestFile();
  
  if (result.success) {
    console.log('\n🎉 Upload completed successfully!');
    console.log('🔗 Storage Path:', result.storagePath);
    console.log('🌐 Public URL:', result.publicUrl);
    
    // 3. If you want to update a specific document record, uncomment and modify:
    // const documentId = 'your-document-id-here';
    // await updateDatabaseRecord(documentId, result.storagePath, result.publicUrl);
    
  } else {
    console.log('\n💥 Upload failed!');
    console.log('❌ Error:', result.error);
  }

  console.log('\n=========================================');
  console.log('Script completed');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for use in other files
module.exports = {
  uploadTestFile,
  listFilesInBucket,
  checkAndCreateBucket,
  updateDatabaseRecord
};