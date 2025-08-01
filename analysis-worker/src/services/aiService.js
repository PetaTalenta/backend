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
      description: "Nama archetype yang paling sesuai, misal: The Analytical Innovator",
    },
    coreMotivators: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 4,
      items: { type: Type.STRING, description: "Motivasi fundamental" },
      description: "Fundamental drivers atau motivasi inti dari persona",
    },
    learningStyle: {
      type: Type.STRING,
      description: "Gaya belajar yang paling efektif untuk persona ini, misal: Visual & Kinesthetic, Anda dapat mendapatkan pengalaman belajar paling baik dengan melihat contoh dan langsung mencoba ",
    },
    shortSummary: {
      type: Type.STRING,
      description: "Ringkasan singkat (2 paragraf) tentang persona user",
    },
    strengthSummary: {
      type: Type.STRING,
      description: "Ringkasan kekuatan utama persona (2 paragraf)",
    },
    strengths: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 6,
      items: {
        type: Type.STRING,
        description: "Kekuatan spesifik persona berdasarkan sintesis data dengan fokus pada VIAIS dan OCEAN, Riasec adalah pendukung, Dalam 1 Kalimat. HANYA berisi konten kekuatan, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
      },
      description: "Daftar kekuatan utama persona. Array ini hanya berisi konten kekuatan, bukan kata 'justification'.",
    },
    weaknessSummary: {
      type: Type.STRING,
      description: "Ringkasan kelemahan utama persona (1 paragraf)",
    },
    weaknesses: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 5,
      items: {
        type: Type.STRING,
        description: "Kelemahan atau area pengembangan persona berdasarkan sintesis data dengan fokus pada VIAIS dan OCEAN, Riasec adalah pendukung, Dalam 1 Kalimat. HANYA berisi konten kelemahan, JANGAN menambahkan kata 'justification' atau kata meta lainnya.",
      },
      description: "Daftar kelemahan persona. Array ini hanya berisi konten kelemahan, bukan kata 'justification'.",
    },
    careerRecommendation: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 4,
      description:
        "Daftar rekomendasi karir sesuai persona dan kecocokan industri, beserta prospeknya",
      items: {
        type: Type.OBJECT,
        required: ["careerName", "justification", "firstSteps", "relatedMajors", "careerProspect"],
        properties: {
          careerName: {
            type: Type.STRING,
            description: "Nama karir atau profesi yang  direkomendasikan, fokus data yang dipakai adalah RIASEC dan VIAIS lalu OCEAN adalah pendukung",
          },
          justification: {
            type: Type.STRING,
            description: "Penjelasan mengapa karir ini cocok berdasarkan data psikometrik diatas",
          },
          firstSteps: {
            type: Type.ARRAY,
            minItems: 3,
            maxItems: 3,
            items: {
              type: Type.STRING,
              description: "Langkah konkret yang bisa diambil siswa SMA. HANYA berisi konten langkah, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
            },
            description: "Langkah konkret yang bisa diambil untuk mengeksplorasi karir ini bagi siswa SMA. Array ini hanya berisi konten langkah, bukan kata 'justification'.",
          },
          relatedMajors: {
            type: Type.ARRAY,
            minItems: 4,
            maxItems: 5,
            items: {
              type: Type.STRING,
              description: "Nama jurusan kuliah yang relevan. HANYA berisi nama jurusan, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
            },
            description: "Jurusan kuliah yang relevan dengan karir ini. Array ini hanya berisi nama jurusan, bukan kata 'justification'.",
          },
          careerProspect: {
            type: Type.OBJECT,
            required: [
              "jobAvailability",
              "salaryPotential",
              "careerProgression",
              "industryGrowth",
              "skillDevelopment",
              "aiOvertake",
            ],
            properties: {
              jobAvailability: {
                type: Type.STRING,
                description:
                  "Sejauh mana lapangan pekerjaan tersedia di bidang tersebut",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
              salaryPotential: {
                type: Type.STRING,
                description:
                  "Potensi pendapatan dari profesi tersebut, termasuk bonus dan insentif",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
              careerProgression: {
                type: Type.STRING,
                description:
                  "Peluang naik jabatan atau spesialisasi di bidang tersebut",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
              industryGrowth: {
                type: Type.STRING,
                description:
                  "Pertumbuhan industri terkait profesi ini di masa depan",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
              skillDevelopment: {
                type: Type.STRING,
                description:
                  "Peluang mengembangkan keahlian di profesi ini",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
              aiOvertake: {
                type: Type.STRING,
                description:
                  "Seberapa besar kemungkinan profesi ini akan digantikan oleh AI di masa depan",
                enum: ["super high", "high", "moderate", "low", "super low"],
              },
            },
          },
        },
      },
    },
    insights: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 5,
      items: {
        type: Type.STRING,
        description: "Saran pengembangan diri yang actionable, berdasarkan kelemahan yang didapatkan sebelumnya juga data psikometrik. HANYA berisi konten saran, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
      },
      description: "Insight atau saran actionable. Array ini hanya berisi konten saran, bukan kata 'justification'.",
    },
    skillSuggestion: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 6,
      items: {
        type: Type.STRING,
        description: "Keahlian atau kompetensi yang disarankan untuk dikembangkan berdasarkan kekuatan yang didapatkan sebelumnya juga data psikometrik. HANYA berisi nama skill, JANGAN menambahkan kata 'justification' atau kata meta lainnya.",
      },
      description: "Rekomendasi pengembangan skill jangka pendek dan menengah. Array ini hanya berisi nama skill, bukan kata 'justification'.",
    },
    possiblePitfalls: {
      type: Type.ARRAY,
      minItems: 4,
      maxItems: 5,
      items: {
        type: Type.STRING,
        description: "Kesalahan atau jebakan karir yang perlu diwaspadai, khususnya dengan data OCEAN dan RIASEC, VIAIS adalah pendukung. HANYA berisi konten jebakan/tantangan, JANGAN menambahkan kata 'justification' atau kata meta lainnya.",
      },
      description: "Hal-hal yang sebaiknya dihindari untuk pengembangan optimal. Array ini hanya berisi konten jebakan/tantangan, bukan kata 'justification'.",
    },
    riskTolerance: {
      type: Type.STRING,
      description:
        "Seberapa tinggi toleransi risiko persona dalam mengambil keputusan karir dan pekerjaan",
      enum: ["very high", "high", "moderate", "low", "very low"],
    },
    workEnvironment: {
      type: Type.STRING,
      description: "Lingkungan kerja ideal (1 paragraf)",
    },
    roleModel: {
      type: Type.ARRAY,
      minItems: 2,
      maxItems: 3,
      items: {
        type: Type.STRING,
        description: "Nama role model yang relevan dengan persona dengan pencapaiannya, e.g: John Doe (Pendiri Perusahaan X)",
      },
      description: "Daftar role model inspiratif",
    },
    developmentActivities: {
      type: Type.OBJECT,
      required: ["extracurricular", "projectIdeas", "bookRecommendations"],
      properties: {
        extracurricular: {
          type: Type.ARRAY,
          minItems: 2,
          maxItems: 3,
          items: {
            type: Type.STRING,
            description: "Nama kegiatan ekstrakurikuler yang spesifik. HANYA berisi nama kegiatan, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
          },
          description: "Kegiatan ekstrakurikuler yang disarankan. Array ini hanya berisi nama kegiatan, bukan kata 'justification' atau kata meta lainnya.",
        },
        projectIdeas: {
          type: Type.ARRAY,
          minItems: 4,
          maxItems: 4,
          items: {
            type: Type.STRING,
            description: "Ide proyek konkret yang bisa dilakukan siswa SMA dengan tingkatan mudah, menengah, sulit dan extreme, extreme adalah biasanya untuk outliers. HANYA berisi deskripsi proyek, JANGAN menambahkan kata 'justification' atau kata meta lainnya."
          },
          description: "Ide proyek untuk membangun portfolio dan skills. Array ini hanya berisi deskripsi proyek, bukan kata 'justification'.",
        },
        bookRecommendations: {
          type: Type.ARRAY,
          minItems: 6,
          maxItems: 6,
          items: {
            type: Type.OBJECT,
            required: ["title", "author", "reason"],
            properties: {
              title: {
                type: Type.STRING,
                description: "Judul buku",
              },
              author: {
                type: Type.STRING,
                description: "Nama penulis",
              },
              reason: {
                type: Type.STRING,
                description: "Alasan mengapa buku ini cocok untuk persona",
              },
            },
          },
          description: "Rekomendasi buku dengan alasan spesifik",
        },
      },
      description: "Aktivitas pengembangan yang disesuaikan dengan konteks siswa SMA",
    },
  },
  required: [
    "archetype",
    "coreMotivators",
    "learningStyle",
    "shortSummary",
    "strengthSummary",
    "strengths",
    "weaknessSummary",
    "weaknesses",
    "careerRecommendation",
    "insights",
    "skillSuggestion",
    "possiblePitfalls",
    "riskTolerance",
    "workEnvironment",
    "roleModel",
    "developmentActivities",
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
  const { riasec, ocean, viaIs, industryScore } = assessmentData;

  // Build VIA-IS section
  const viaIsSection = Object.entries(viaIs)
    .map(([key, value]) => `- ${formatCamelCase(key)}: ${value}/100`)
    .join("\n");

  // Build Industry Score section (optional)
  let industryScoreSection = '';
  if (industryScore && Object.keys(industryScore).length > 0) {
    industryScoreSection = Object.entries(industryScore)
      .map(([key, value]) => `- ${formatCamelCase(key)}: ${value}/100`)
      .join("\n");
  }

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
${industryScoreSection ? `
## Industry Interest Scores:
${industryScoreSection}` : ''}
</DATA_ASSESSMENT>

# PRINSIP ANALISIS HOLISTIK (WAJIB DIIKUTI)

Ini adalah prinsip utama yang harus memandu seluruh analisis Anda. Fleksibilitas dan kejujuran lebih penting daripada sekadar mengikuti formula yang kaku.

1.  **Cari Pola, Bukan Hanya Skor Tertinggi:** Jangan hanya mengambil skor teratas dari setiap tes. Lihatlah keseluruhan data untuk menemukan pola yang konsisten. Kombinasi skor sedang di beberapa area bisa lebih bermakna daripada satu skor tinggi yang terisolasi.

2.  **Kejujuran Konstruktif:**
    *   **Jika semua skor RIASEC rendah:** Akui secara jujur bahwa minat karier siswa belum terbentuk secara spesifik. Jelaskan bahwa ini adalah hal yang wajar dan berikan saran untuk **fase eksplorasi** (mencoba berbagai ekskul, magang singkat, atau proyek pribadi) untuk menemukan minat.
    *   **Jika semua skor Kekuatan Karakter (VIA-IS) tidak menonjol:** Jangan memaksakan adanya "kekuatan super". Jelaskan bahwa ini adalah area yang sangat baik untuk dikembangkan secara sadar. Fokuskan rekomendasi pada cara membangun karakter dan kebiasaan positif, alih-alih mengasumsikan kekuatan itu sudah ada.

3.  **Fokus pada Data yang Paling Jelas:** Jika hasil dari satu alat tes (misal: OCEAN) sangat jelas dan menonjol, sementara yang lain (misal: RIASEC) menyebar atau rendah, jadikan data yang jelas itu sebagai jangkar analisis. Gunakan data yang kurang jelas sebagai konteks atau area untuk dieksplorasi lebih lanjut.

4.  **Personalisasi Penuh:** Hindari kalimat template. Setiap laporan harus terasa unik. Buatlah **Arketipe Potensi** yang deskriptif dan personal untuk setiap siswa, alih-alih menggunakan kategori yang sudah ada.

---
# PROSES ANALISIS (Sebagai Panduan)

Gunakan 5 langkah ini sebagai kerangka kerja, namun selalu terapkan **Prinsip Analisis Holistik** di setiap langkahnya.

1. Pemindaian Data Awal:
Tinjau semua skor dari RIASEC, OCEAN, VIA, dan Minat Industri. Catat skor tertinggi dan terendah, namun yang lebih penting adalah mengamati pola, klaster, dan korelasi. Misalnya, apakah skor tinggi pada Openness (OCEAN) berkorelasi dengan Artistic (RIASEC) yang tinggi? Apakah Conscientiousness yang tinggi sejalan dengan kekuatan utama VIA seperti "Ketekunan" atau "Pengendalian Diri"?

2. Interpretasi Setiap Tes:
RIASEC: Apa makna dari kode Holland tiga huruf (misalnya SIA, ERC)? Jika skor terlihat datar atau rendah, catat sebagai "minat yang tidak terdiferensiasi".
OCEAN: Jelaskan profil kepribadian. Apakah individu ini lebih cenderung introvert atau ekstrovert? Terorganisir atau spontan? Terbuka pada pengalaman baru atau lebih menyukai rutinitas? Bagaimana tingkat Neuroticism memengaruhi potensinya?
VIA: Identifikasi 3–5 kekuatan utama. Bagaimana kekuatan ini tercermin dalam perilaku sehari-hari?
Minat Industri: Industri apa yang paling menarik bagi individu ini? Sejauh mana minat tersebut selaras dengan hasil RIASEC dan OCEAN?

3. Sintesis & Pembentukan Arketipe:
Gabungkan semua wawasan yang diperoleh. Apa narasi utama dari keseluruhan data ini? Buatlah satu "Arketipe Potensial" yang unik dan deskriptif, yang merangkum esensi individu tersebut.
Contoh: "Pencerita Analitis", "Perancang Sistem yang Empatik", "Penjelajah yang Realistis".
Sertakan alasan ringkas yang mendukung pemilihan arketipe ini berdasarkan sinergi data.

4. Rumuskan Rekomendasi:
Berdasarkan arketipe dan hasil sintesis data, buat rekomendasi konkret.
Jurusan: Hubungkan jurusan yang relevan langsung dengan hasil RIASEC, OCEAN, dan kekuatan utama. (Contoh: Investigative tinggi + Openness tinggi → Ilmu Komputer dengan fokus pada AI, atau Ilmu Kognitif).
Karier: Gunakan kode Holland, ciri kepribadian, dan skor Minat Industri untuk menyarankan jalur karier yang spesifik. Jelaskan alasan setiap rekomendasi secara jelas.
Keterampilan: Keterampilan apa yang perlu dikembangkan untuk memaksimalkan kekuatan dan mengatasi area yang masih perlu ditingkatkan?


# ATURAN PENTING UNTUK OUTPUT JSON

## ATURAN ARRAY - SANGAT PENTING!
- Semua array (insights, strengths, weaknesses, skillSuggestion, possiblePitfalls, firstSteps, relatedMajors) harus HANYA berisi konten yang diminta
- JANGAN PERNAH menambahkan kata "justification" atau kata meta lainnya ke dalam array
- Setiap item dalam array harus berupa konten aktual (insight, kekuatan, kelemahan, skill, dll), bukan kata kunci atau placeholder
- Field "justification" HANYA ada di dalam object careerRecommendation, tidak di tempat lain

## ATURAN UMUM
- Penjelasan gunakan bahasa Indonesia formal dan professional namun yang mudah dipahami oleh siswa
- Jangan struktur bahasa gunakan pembahasan yang kaku
- Jangan terjemahkan terminologi bahasa inggris ke bahasa indonesia
- Jangan terjemahkan nama pekerjaan bahasa inggris
- Jangan terjemahkan sesuatu yang tidak memiliki kata pasti di KBBI
- Jangan Bersifat afirmatif dan kekurangan TIDAK BOLEH DITUTUPI
- Refer ke pengguna sebagai ANDA
- Pastikan tidak ada data yang diulangi 2x, misal rekomendasi karir 1 dan 3 itu sama persis
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
