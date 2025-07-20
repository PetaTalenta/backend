/**
 * Google Generative AI Service
 */

const { Type } = require("@google/genai");
const ai = require("../config/ai");
const logger = require("../utils/logger");
const { validatePersonaProfile } = require("../utils/validator");
const mockAiService = require("./mockAiService");
const TokenCounterService = require("./tokenCounterService");
const UsageTracker = require("./usageTracker");

// Initialize token counting services
const tokenCounter = new TokenCounterService();
const usageTracker = new UsageTracker();

/**
 * Initialize AI service
 */
const initialize = () => {
  try {
    // Initialize Google Generative AI
    ai.initialize();

    logger.info("AI service initialized");
  } catch (error) {
    logger.error("Failed to initialize AI service", { error: error.message });
    throw error;
  }
};

/**
 * Generate persona profile from assessment data
 * @param {Object} assessmentData - Assessment data
 * @param {String} jobId - Job ID for logging
 * @returns {Promise<Array>} - Persona profile
 */
const generatePersonaProfile = async (assessmentData, jobId) => {
  const startTime = Date.now();
  let inputTokenData = null;
  let outputTokenData = null;

  try {
    logger.info("Generating persona profile", { jobId });

    // Check if using mock model or test API key - return mock data for testing
    if (ai.config.useMockModel || process.env.GOOGLE_AI_API_KEY === "test_api_key_placeholder") {
      logger.info("Using mock AI model", { jobId });

      // Handle mock token counting for testing consistency
      try {
        const mockPrompt = buildPrompt(assessmentData);
        inputTokenData = await tokenCounter.getMockTokenCount(mockPrompt, jobId);
        
        logger.debug("Mock token counting completed", {
          jobId,
          inputTokens: inputTokenData.inputTokens
        });
      } catch (tokenError) {
        logger.warn("Mock token counting failed, continuing without token data", {
          jobId,
          error: tokenError.message
        });
      }

      const mockResult = await mockAiService.generateMockPersonaProfile(assessmentData, jobId);

      // Track mock usage if token counting succeeded
      if (inputTokenData) {
        const responseTime = Date.now() - startTime;
        usageTracker.trackUsage(jobId, {
          ...inputTokenData,
          outputTokens: inputTokenData.outputTokens || 150, // Mock output tokens
          totalTokens: (inputTokenData.inputTokens || 0) + (inputTokenData.outputTokens || 150)
        }, { responseTime });
      }

      return mockResult;
    }

    // Get AI client
    const client = ai.getClient();

    // Build prompt
    const prompt = buildPrompt(assessmentData);

    // Count input tokens before API call
    try {
      inputTokenData = await tokenCounter.countInputTokens(client, ai.config.model, prompt, jobId);
      
      logger.debug("Input token counting completed", {
        jobId,
        inputTokens: inputTokenData.inputTokens
      });
    } catch (tokenError) {
      logger.warn("Input token counting failed, continuing with AI operation", {
        jobId,
        error: tokenError.message
      });
      // Continue with AI operation even if token counting fails
    }

    // Define response schema for structured output
    const responseSchema = {
      type: Type.OBJECT,
      description: "Analisis persona profile",
      properties: {
        archetype: {
          type: Type.STRING,
          description: "Nama archetype yang paling sesuai",
        },
        shortSummary: {
          type: Type.STRING,
          description: "Ringkasan singkat (1-2 paragraf) tentang persona",
        },
        strengths: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 5,
          items: { type: Type.STRING, description: "Kekuatan spesifik" },
          description: "Daftar kekuatan persona",
        },
        weaknesses: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 5,
          items: {
            type: Type.STRING,
            description: "Kelemahan atau area pengembangan",
          },
          description: "Daftar kelemahan persona",
        },
        careerRecommendation: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 5,
          description:
            "Daftar rekomendasi karir sesuai persona, beserta prospeknya",
          items: {
            type: Type.OBJECT,
            required: ["careerName", "careerProspect"],
            properties: {
              careerName: {
                type: Type.STRING,
                description: "Nama karir atau profesi yang direkomendasikan",
              },
              careerProspect: {
                type: Type.OBJECT,
                required: [
                  "jobAvailability",
                  "salaryPotential",
                  "careerProgression",
                  "industryGrowth",
                  "skillDevelopment",
                ],
                properties: {
                  jobAvailability: {
                    type: Type.STRING,
                    description: "Menggambarkan sejauh mana lapangan pekerjaan tersedia di bidang tersebut, baik di tingkat lokal, nasional, maupun global.",
                    enum: [
                      "super high",
                      "high",
                      "moderate",
                      "low",
                      "super low",
                    ],
                  },
                  salaryPotential: {
                    type: Type.STRING,
                    description: "Mengukur potensi pendapatan dari profesi tersebut, termasuk gaji pokok, bonus, insentif, dan peluang pendapatan lain.",
                    enum: [
                      "super high",
                      "high",
                      "moderate",
                      "low",
                      "super low",
                    ],
                  },
                  careerProgression: {
                    type: Type.STRING,
                    description: "Menilai seberapa besar peluang seorang profesional naik ke posisi yang lebih tinggi, termasuk ke level manajerial atau spesialisasi tertentu.",
                    enum: [
                      "super high",
                      "high",
                      "moderate",
                      "low",
                      "super low",
                    ],
                  },
                  industryGrowth: {
                    type: Type.STRING,
                    description: "Melihat apakah industri tempat profesi itu berada sedang berkembang, stagnan, atau menurun. Termasuk potensi pasar di masa depan, dampak teknologi, dan dinamika tren global.",
                    enum: [
                      "super high",
                      "high",
                      "moderate",
                      "low",
                      "super low",
                    ],
                  },
                  skillDevelopment: {
                    type: Type.STRING,
                    description: "Menilai apakah profesi ini memungkinkan individu untuk mengembangkan keahlian, baik teknis maupun soft skills, yang relevan dengan perkembangan zaman.",
                    enum: [
                      "super high",
                      "high",
                      "moderate",
                      "low",
                      "super low",
                    ],
                  },
                },
              },
            },
          },
        },
        insights: {
          type: Type.ARRAY,
          minItems: 3,
          maxItems: 5,
          items: { type: Type.STRING, description: "Saran pengembangan diri" },
          description: "Insight atau saran actionable",
        },
        workEnvironment: {
          type: Type.STRING,
          description: "Lingkungan kerja ideal (1 paragraf)",
        },
        roleModel: {
          type: Type.ARRAY,
          minItems: 4,
          maxItems: 5,
          items: {
            type: Type.STRING,
            description: "Nama role model yang relevan",
          },
          description: "Daftar role model inspiratif",
        },
      },
      required: [
        "archetype",
        "shortSummary",
        "strengths",
        "weaknesses",
        "careerRecommendation",
        "insights",
        "workEnvironment",
        "roleModel",
      ],
    };

    // Generate content with structured output
    const response = await client.models.generateContent({
      model: ai.config.model,
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah seorang Psikolog Pakar Analisis Karir dan Kepribadian. Keahlian utama Anda adalah mensintesis data dari berbagai asesmen psikometrik (RIASEC, OCEAN, VIA-IS) menjadi sebuah laporan persona yang koheren, mendalam, dan sangat actionable. Gaya komunikasi Anda bersifat klinis, objektif, dan langsung pada inti persoalan (no sugarcoating) untuk memberikan pemahaman yang jujur dan jernih kepada audiens (mahasiswa/pelajar).",
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: ai.config.temperature,
      },
    });

    // Extract usage metadata from API response
    try {
      outputTokenData = await tokenCounter.extractUsageMetadata(response, jobId);
      
      logger.info("AI response received", {
        jobId,
        tokens: outputTokenData.totalTokens,
        cost: outputTokenData.estimatedCost
      });
    } catch (tokenError) {
      logger.warn("Failed to extract token usage metadata, using fallback logging", {
        jobId,
        error: tokenError.message
      });
      
      // Fallback to original logging format
      logger.info("AI response received", {
        jobId,
        responseLength: response.text.length,
        thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount || 0,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
      });
    }

    // Parse JSON response directly (no need for manual parsing)
    const personaProfile = JSON.parse(response.text);

    // Validate persona profile
    const validationResult = validatePersonaProfile(personaProfile);
    if (!validationResult.isValid) {
      throw new Error(`Invalid persona profile: ${validationResult.error}`);
    }

    // Track usage statistics
    try {
      const responseTime = Date.now() - startTime;
      
      // Combine input and output token data for tracking
      const combinedTokenData = {
        inputTokens: (inputTokenData?.inputTokens || 0),
        outputTokens: (outputTokenData?.outputTokens || 0),
        totalTokens: (outputTokenData?.totalTokens || (inputTokenData?.inputTokens || 0) + (outputTokenData?.outputTokens || 0)),
        model: ai.config.model,
        estimatedCost: outputTokenData?.estimatedCost || (inputTokenData?.estimatedCost || 0),
        success: true,
        fallbackUsed: inputTokenData?.fallbackUsed || false
      };
      
      usageTracker.trackUsage(jobId, combinedTokenData, { responseTime });
      
      logger.debug("Usage tracking completed", { jobId });
    } catch (trackingError) {
      logger.warn("Failed to track usage statistics", {
        jobId,
        error: trackingError.message
      });
    }

    return personaProfile;
  } catch (error) {
    logger.error("Failed to generate persona profile", {
      jobId,
      error: error.message,
    });

    // Track failed usage if we have token data
    try {
      if (inputTokenData || outputTokenData) {
        const responseTime = Date.now() - startTime;
        const failedTokenData = {
          inputTokens: (inputTokenData?.inputTokens || 0),
          outputTokens: (outputTokenData?.outputTokens || 0),
          totalTokens: (inputTokenData?.totalTokens || 0) + (outputTokenData?.totalTokens || 0),
          model: ai.config.model,
          estimatedCost: (inputTokenData?.estimatedCost || 0) + (outputTokenData?.estimatedCost || 0),
          success: false,
          fallbackUsed: inputTokenData?.fallbackUsed || false
        };
        
        usageTracker.trackUsage(jobId, failedTokenData, { responseTime });
      }
    } catch (trackingError) {
      logger.warn("Failed to track failed usage statistics", {
        jobId,
        error: trackingError.message
      });
    }

    throw error;
  }
};

/**
 * Build prompt for AI
 * @param {Object} assessmentData - Assessment data
 * @returns {String} - Prompt for AI
 */
const buildPrompt = (assessmentData) => {
  // Extract assessment data
  const { riasec, ocean, viaIs } = assessmentData;

  // Build VIA-IS section
  const viaIsSection = Object.entries(viaIs)
    .map(([key, value]) => `- ${formatCamelCase(key)}: ${value}/100`)
    .join("\n");

  // Build prompt
  return `
# KONTEKS TUGAS
Anda akan menerima satu set data hasil asesmen psikometrik dari seorang individu. Tugas Anda adalah melakukan analisis komprehensif dan menghasilkan output dalam format JSON yang telah ditentukan. Analisis harus menghubungkan titik-titik antara berbagai hasil tes untuk mengungkap pola-pola yang mendasari kepribadian, potensi, dan area pengembangan individu tersebut.

# DATA INPUT
Berikut adalah data asesmen yang akan dianalisis. Skor berada dalam skala 0-100.

<DATA_ASSESSMENT>
## RIASEC Assessment:
- Realistic: ${riasec.realistic}
- Investigative: ${riasec.investigative}
- Artistic: ${riasec.artistic}
- Social: ${riasec.social}
- Enterprising: ${riasec.enterprising}
- Conventional: ${riasec.conventional}

## OCEAN Personality Assessment:
- Openness: ${ocean.openness}
- Conscientiousness: ${ocean.conscientiousness}
- Extraversion: ${ocean.extraversion}
- Agreeableness: ${ocean.agreeableness}
- Neuroticism: ${ocean.neuroticism}

## VIA Character Strengths:
${viaIsSection}
</DATA_ASSESSMENT>

# PROSES BERPIKIR HOLISTIK (METODOLOGI INTI)
Sebelum menghasilkan output JSON, lakukan proses penalaran internal berikut. Ini adalah proses untuk membangun pemahaman dari dasar, tanpa bias pada satu tema awal.

**Langkah 1: Pemetaan Lanskap Data (The Data Landscape)**
- **Ekstrak Sinyal Kunci:** Dari setiap blok asesmen (RIASEC, OCEAN, VIA-IS), identifikasi poin-poin data yang paling signifikan (skor tertinggi dan terendah). Jangan menyimpulkan apa pun dulu. Cukup petakan fakta-fakta mentah ini.
- **Contoh Catatan Mental:**
  - *RIASEC:* Investigative (tinggi), Social (rendah).
  - *OCEAN:* Openness (tinggi), Agreeableness (rendah), Neuroticism (sedang-tinggi).
  - *VIA-IS:* Top strength: Judgment, Critical Thinking.

**Langkah 2: Sintesis Multi-Dimensi (Weaving the Fabric)**
- Sekarang, lihat semua sinyal kunci dari Langkah 1 sebagai sebuah jaring yang saling berhubungan. Tugas Anda adalah menenun benang-benang ini untuk melihat gambaran utuh yang muncul.
- **Identifikasi Kluster Sinergi (Kekuatan Gabungan):** Cari kelompok data dari tes yang berbeda yang saling memperkuat.
  - *Contoh:* "Investigative (tinggi)" + "VIA-IS: Judgment" + "OCEAN: Openness (tinggi)" secara bersama-sama membentuk kluster kekuatan yang sangat kuat dalam **analisis kritis dan pemecahan masalah kreatif**. Ini akan menjadi dasar untuk "strengths".
- **Identifikasi Kluster Tegangan (Tantangan & Kompleksitas):** Cari kombinasi data yang menciptakan friksi atau kompleksitas unik. Di sinilah wawasan paling mendalam berada.
  - *Contoh:* "Openness (tinggi)" (terbuka pada ide baru) + "Conventional (sedang-tinggi)" (suka prosedur) menciptakan tegangan antara **inovasi dan kebutuhan akan keteraturan**. Ini bisa menjadi "weakness" ("kesulitan beradaptasi di lingkungan yang kacau") atau "insight" ("cari peran inovasi dalam sistem yang sudah ada").
  - *Contoh lain:* "Conscientiousness (tinggi)" + "Neuroticism (tinggi)" menunjuk ke **profil perfeksionis yang cemas**, sebuah tantangan inti yang harus dibahas.

**Langkah 3: Formulasi Profil yang Muncul (The Emergent Profile)**
- Profil persona tidak ditentukan di awal, tetapi *muncul* dari sintesis di Langkah 2.
- **"archetype" & "shortSummary":** Berdasarkan gambaran utuh (kluster sinergi dan tegangan), formulasikan sebuah arketipe dan ringkasan yang menangkap esensi individu secara akurat. Contoh: Bukan lagi "Strategic Analyst," tetapi mungkin "The Meticulous Systems Analyst" untuk mencerminkan tegangan antara "Investigative" dan "Conventional".
- **"strengths" & "weaknesses":** Terjemahkan "Kluster Sinergi" menjadi kekuatan konkret. Terjemahkan "Kluster Tegangan" menjadi area pengembangan yang jujur dan actionable.
- **"insights", "workEnvironment", "careerRecommendation":** Semua elemen ini harus secara langsung menjawab hasil sintesis holistik. Rekomendasi karir harus menyeimbangkan semua faktor—memanfaatkan sinergi sambil menyediakan struktur untuk mengelola tegangan.

# CATATAN
- Jangan terjemahkan terminologi bahasa inggris ke bahasa indonesia
- Jangan terjemahkan nama pekerjaan bahasa inggris
- Jangan terjemahkan sesuatu yang tidak memiliki kata pasti di KBBI
`
};

/**
 * Format camelCase to Title Case
 * @param {String} text - camelCase text
 * @returns {String} - Title Case text
 */
const formatCamelCase = (text) => {
  // Convert camelCase to space-separated
  const spaced = text.replace(/([A-Z])/g, " $1");

  // Convert to Title Case
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

module.exports = {
  initialize,
  generatePersonaProfile,
};
