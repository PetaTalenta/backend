/**
 * Archive Service Integration Examples
 * Contoh penggunaan API Archive Service dari Assessment Service
 */

const archiveService = require('../src/services/archiveService');
const { v4: uuidv4 } = require('uuid');

/**
 * Example 1: Create Job in Archive Service
 */
const createJobExample = async () => {
  try {
    const jobId = uuidv4();
    const userId = uuidv4();
    const assessmentData = {
      riasec: {
        realistic: 4.2,
        investigative: 3.8,
        artistic: 2.1,
        social: 4.5,
        enterprising: 3.2,
        conventional: 2.8
      },
      ocean: {
        openness: 4.1,
        conscientiousness: 3.9,
        extraversion: 3.5,
        agreeableness: 4.2,
        neuroticism: 2.3
      },
      viaIs: {
        creativity: 4.0,
        curiosity: 3.8,
        judgment: 3.5
      }
    };

    const job = await archiveService.createJob(
      jobId,
      userId,
      assessmentData,
      'AI-Driven Talent Mapping'
    );

    console.log('Job created successfully:', job);
    return job;
  } catch (error) {
    console.error('Failed to create job:', error.message);
    throw error;
  }
};

/**
 * Example 2: Create Analysis Result Directly
 */
const createAnalysisResultExample = async () => {
  try {
    const userId = uuidv4();
    const assessmentData = {
      riasec: {
        realistic: 4.2,
        investigative: 3.8,
        artistic: 2.1,
        social: 4.5,
        enterprising: 3.2,
        conventional: 2.8
      },
      ocean: {
        openness: 4.1,
        conscientiousness: 3.9,
        extraversion: 3.5,
        agreeableness: 4.2,
        neuroticism: 2.3
      }
    };

    const personaProfile = {
      archetype: "The Helper",
      personality_summary: "Individu yang memiliki kecenderungan sosial tinggi dengan kemampuan komunikasi interpersonal yang baik.",
      career_recommendations: [
        "Human Resources Manager",
        "Social Worker",
        "Teacher",
        "Counselor"
      ],
      strengths: [
        "Komunikasi interpersonal yang baik",
        "Empati tinggi",
        "Kemampuan bekerja dalam tim",
        "Kepedulian terhadap orang lain"
      ],
      development_areas: [
        "Pengembangan keterampilan teknis",
        "Manajemen waktu",
        "Kepemimpinan strategis"
      ],
      personality_traits: {
        dominant_riasec: "Social",
        dominant_ocean: "Agreeableness",
        key_strengths: ["Empathy", "Communication", "Teamwork"]
      }
    };

    const result = await archiveService.createAnalysisResult(
      userId,
      assessmentData,
      personaProfile,
      'AI-Driven Talent Mapping',
      'completed'
    );

    console.log('Analysis result created successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to create analysis result:', error.message);
    throw error;
  }
};

/**
 * Example 3: Create Failed Analysis Result
 */
const createFailedAnalysisResultExample = async () => {
  try {
    const userId = uuidv4();
    const assessmentData = {
      riasec: {
        realistic: 4.2,
        investigative: 3.8
        // Incomplete data
      }
    };

    const result = await archiveService.createAnalysisResult(
      userId,
      assessmentData,
      null, // No persona profile for failed analysis
      'AI-Driven Talent Mapping',
      'failed',
      'Incomplete assessment data provided'
    );

    console.log('Failed analysis result created successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to create failed analysis result:', error.message);
    throw error;
  }
};

/**
 * Example 4: Get Job Status
 */
const getJobStatusExample = async (jobId) => {
  try {
    const jobStatus = await archiveService.getJobStatus(jobId);
    
    if (jobStatus) {
      console.log('Job status retrieved:', jobStatus);
    } else {
      console.log('Job not found');
    }
    
    return jobStatus;
  } catch (error) {
    console.error('Failed to get job status:', error.message);
    throw error;
  }
};

/**
 * Example 5: Get Analysis Result
 */
const getAnalysisResultExample = async (resultId) => {
  try {
    const result = await archiveService.getAnalysisResult(resultId);
    
    if (result) {
      console.log('Analysis result retrieved:', result);
    } else {
      console.log('Analysis result not found');
    }
    
    return result;
  } catch (error) {
    console.error('Failed to get analysis result:', error.message);
    throw error;
  }
};

/**
 * Example 6: Update Analysis Result
 */
const updateAnalysisResultExample = async (resultId) => {
  try {
    const updateData = {
      status: 'completed',
      persona_profile: {
        archetype: "The Updated Helper",
        personality_summary: "Updated personality summary",
        career_recommendations: [
          "Updated Career 1",
          "Updated Career 2"
        ]
      }
    };

    const updatedResult = await archiveService.updateAnalysisResult(resultId, updateData);
    console.log('Analysis result updated successfully:', updatedResult);
    return updatedResult;
  } catch (error) {
    console.error('Failed to update analysis result:', error.message);
    throw error;
  }
};

/**
 * Example 7: Sync Job Status
 */
const syncJobStatusExample = async (jobId) => {
  try {
    const syncResult = await archiveService.syncJobStatus(
      jobId,
      'completed',
      {
        result_id: uuidv4(),
        processing_time: 45.5,
        completion_timestamp: new Date().toISOString()
      }
    );

    console.log('Job status synced successfully:', syncResult);
    return syncResult;
  } catch (error) {
    console.error('Failed to sync job status:', error.message);
    throw error;
  }
};

/**
 * Example 8: Check Archive Service Health
 */
const checkHealthExample = async () => {
  try {
    const isHealthy = await archiveService.checkHealth();
    console.log('Archive Service health status:', isHealthy ? 'Healthy' : 'Unhealthy');
    return isHealthy;
  } catch (error) {
    console.error('Failed to check health:', error.message);
    throw error;
  }
};

/**
 * Run all examples
 */
const runAllExamples = async () => {
  console.log('=== Archive Service Integration Examples ===\n');

  try {
    // Example 1: Create Job
    console.log('1. Creating job...');
    const job = await createJobExample();
    
    // Example 2: Create Analysis Result
    console.log('\n2. Creating analysis result...');
    const result = await createAnalysisResultExample();
    
    // Example 3: Create Failed Analysis Result
    console.log('\n3. Creating failed analysis result...');
    await createFailedAnalysisResultExample();
    
    // Example 4: Get Job Status
    console.log('\n4. Getting job status...');
    await getJobStatusExample(job.job_id);
    
    // Example 5: Get Analysis Result
    console.log('\n5. Getting analysis result...');
    await getAnalysisResultExample(result.id);
    
    // Example 6: Update Analysis Result
    console.log('\n6. Updating analysis result...');
    await updateAnalysisResultExample(result.id);
    
    // Example 7: Sync Job Status
    console.log('\n7. Syncing job status...');
    await syncJobStatusExample(job.job_id);
    
    // Example 8: Check Health
    console.log('\n8. Checking Archive Service health...');
    await checkHealthExample();
    
    console.log('\n=== All examples completed successfully! ===');
  } catch (error) {
    console.error('\n=== Example failed ===');
    console.error('Error:', error.message);
  }
};

module.exports = {
  createJobExample,
  createAnalysisResultExample,
  createFailedAnalysisResultExample,
  getJobStatusExample,
  getAnalysisResultExample,
  updateAnalysisResultExample,
  syncJobStatusExample,
  checkHealthExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
