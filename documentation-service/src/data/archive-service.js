export const archiveServiceData = {
  name: "Archive Service",
  description: "Archive Service menyediakan API untuk mengelola hasil analisis assessment dan job tracking. API ini diakses melalui API Gateway pada port 3000 dengan prefix /api/archive/. Fitur utama termasuk manajemen hasil analisis, tracking job processing, dan sharing hasil analisis secara publik.",
  features: [
    "Manajemen hasil analisis assessment",
    "Tracking status job processing",
    "Public sharing hasil analisis", 
    "Access control berbasis ownership",
    "Pagination dan filtering",
    "Real-time job monitoring",
    "Status consistency between jobs and results",
    "Cascade delete functionality",
    "Orphaned data cleanup",
    "Status synchronization tools"
  ],
  useCases: [
    "Menyimpan dan mengelola hasil assessment user",
    "Tracking progress analisis AI",
    "Sharing hasil assessment ke HR/recruiter",
    "Portfolio online untuk kandidat",
    "Konsultasi karir dengan mentor",
    "Studi penelitian dan analisis data"
  ],
  sharingFeature: {
    title: "Public Result Sharing",
    description: "Fitur untuk membagikan hasil analisis assessment secara publik tanpa memerlukan autentikasi.",
    benefits: [
      "Mudah berbagi hasil assessment ke pihak ketiga",
      "Portfolio online untuk pencari kerja",
      "Konsultasi karir yang lebih efektif",
      "Kolaborasi dalam penelitian",
      "Transparansi dalam proses rekrutmen"
    ],
    security: [
      "Hanya pemilik yang dapat mengubah status public/private",
      "Hasil private tetap terlindungi",
      "Audit trail untuk setiap perubahan",
      "Access control berbasis ownership"
    ]
  },
  statusConsistency: {
    title: "Status Consistency & Cascade Delete",
    description: "Sistem untuk memastikan konsistensi status antara analysis_jobs dan analysis_results serta implementasi cascade delete functionality.",
    improvements: [
      "Results sekarang mendukung semua status: queued, processing, completed, failed, cancelled",
      "Status selalu sinkron antara jobs dan results",
      "Implementasi method deleteJobByJobId untuk internal services",
      "Cascade delete: hapus job akan hapus result, hapus result akan hapus job",
      "Cleanup otomatis untuk orphaned jobs dan results",
      "Status synchronization tools untuk maintenance"
    ],
    statusMapping: {
      "queued": "processing",
      "processing": "processing", 
      "completed": "completed",
      "failed": "failed",
      "cancelled": "failed"
    },
    cascadeRules: [
      "Delete job → soft delete job (status cancelled) + hard delete result",
      "Delete result → hard delete result + hard delete job terkait",
      "Sync status → mapping status sesuai business rules",
      "Cleanup orphaned → hapus job dengan result_id tidak valid"
    ],
    internalEndpoints: [
      "POST /jobs/:jobId/sync-status - Sinkronisasi status job-result",
      "POST /jobs/cleanup-orphaned - Cleanup orphaned jobs",
      "DELETE /jobs/:jobId - Delete dengan cascade (internal access)"
    ]
  },
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3002",
  internalPort: "3002",
  externalAccess: "Via API Gateway (Port 3000)",
  authentication: "JWT Bearer Token Required",
  rateLimit: "5000 requests per 15 minutes",
  endpoints: [
    {
      method: "GET",
      path: "/api/archive/results",
      title: "Get User Results",
      description: "Mendapatkan daftar hasil analisis untuk user yang terautentikasi.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "Halaman data (default: 1)"
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "Jumlah data per halaman (default: 10)"
        },
        {
          name: "status",
          type: "string",
          required: false,
          description: "Filter berdasarkan status"
        },
        {
          name: "sort",
          type: "string",
          required: false,
          description: "Field untuk sorting (default: 'created_at')"
        },
        {
          name: "order",
          type: "string",
          required: false,
          description: "Urutan sorting (default: 'DESC')"
        }
      ],
      response: {
        success: true,
        message: "Results retrieved successfully",
        data: {
          results: [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              user_id: "550e8400-e29b-41d4-a716-446655440002",
              test_data: {
                riasec: {
                  realistic: 75,
                  investigative: 85,
                  artistic: 65,
                  social: 70,
                  enterprising: 80,
                  conventional: 60
                },
                ocean: {
                  openness: 88,
                  conscientiousness: 75,
                  extraversion: 72,
                  agreeableness: 85,
                  neuroticism: 35
                },
                viaIs: {
                  creativity: 82,
                  curiosity: 90,
                  judgment: 78,
                  loveOfLearning: 95,
                  perspective: 75,
                  bravery: 68,
                  perseverance: 85,
                  honesty: 88,
                  zest: 76,
                  love: 82,
                  kindness: 87,
                  socialIntelligence: 74,
                  teamwork: 79,
                  fairness: 86,
                  leadership: 72,
                  forgiveness: 77,
                  humility: 81,
                  prudence: 73,
                  selfRegulation: 84,
                  appreciationOfBeauty: 69,
                  gratitude: 89,
                  hope: 83,
                  humor: 71,
                  spirituality: 58
                }
              },
              test_result: {
                archetype: "The Analytical Innovator",
                coreMotivators: [
                  "Problem-Solving",
                  "Learning & Mastery",
                  "Creative Expression",
                  "Impact & Contribution"
                ],
                learningStyle: "Visual & Kinesthetic (Belajar paling baik dengan melihat contoh dan langsung mencoba)",
                shortSummary: "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
                strengthSummary: "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru. Ini membuat Anda mampu menghasilkan solusi unik di berbagai situasi kompleks.",
                strengths: [
                  "Kemampuan analisis yang tajam",
                  "Kreativitas dan inovasi",
                  "Keingintahuan intelektual yang tinggi",
                  "Kemampuan belajar mandiri yang kuat",
                  "Pemikiran sistematis dan terstruktur"
                ],
                weaknessSummary: "Anda cenderung overthinking, perfeksionis, dan kadang kurang sabar menghadapi proses lambat atau bekerja sama dengan orang lain.",
                weaknesses: [
                  "Terkadang terlalu perfeksionis",
                  "Dapat terjebak dalam overthinking",
                  "Kurang sabar dengan proses yang lambat",
                  "Kemampuan sosial yang perlu dikembangkan",
                  "Kesulitan mendelegasikan tugas"
                ],
                careerRecommendation: [
                  {
                    careerName: "Data Scientist",
                    justification: "Sangat cocok karena menggabungkan kekuatan analitis (OCEAN: Conscientiousness) dan minat investigatif (RIASEC: Investigative) Anda. Peran ini memungkinkan Anda memecahkan masalah kompleks menggunakan data, yang sejalan dengan arketipe 'Analytical Innovator'.",

                    relatedMajors: ["Statistika", "Ilmu Komputer", "Matematika", "Sistem Informasi"],
                    careerProspect: {
                      jobAvailability: "high",
                      salaryPotential: "high",
                      careerProgression: "high",
                      industryGrowth: "super high",
                      skillDevelopment: "super high",
                      aiOvertake: "moderate"
                    }
                  },
                  {
                    careerName: "Peneliti",
                    justification: "Minat investigatif yang tinggi dan keterbukaan terhadap pengalaman baru membuat Anda cocok untuk dunia penelitian. Kemampuan analitis mendalam mendukung proses riset yang sistematis.",

                    relatedMajors: ["Psikologi", "Biologi", "Fisika", "Kimia", "Sosiologi"],
                    careerProspect: {
                      jobAvailability: "moderate",
                      salaryPotential: "moderate",
                      careerProgression: "moderate",
                      industryGrowth: "moderate",
                      skillDevelopment: "high",
                      aiOvertake: "low"
                    }
                  },
                  {
                    careerName: "Pengembang Software",
                    justification: "Kombinasi kreativitas dan kemampuan analitis yang kuat sangat sesuai untuk pengembangan software. Keterbukaan terhadap teknologi baru mendukung adaptasi di industri yang dinamis.",

                    relatedMajors: ["Teknik Informatika", "Ilmu Komputer", "Sistem Informasi", "Teknik Komputer"],
                    careerProspect: {
                      jobAvailability: "super high",
                      salaryPotential: "high",
                      careerProgression: "high",
                      industryGrowth: "super high",
                      skillDevelopment: "super high",
                      aiOvertake: "moderate"
                    }
                  },
                  {
                    careerName: "Product Manager",
                    justification: "Menggabungkan kemampuan analitis, komunikasi, dan kepemimpinan untuk memimpin pengembangan produk yang berdampak. Cocok bagi profil dengan kombinasi Investigative-Enterprising dan kreativitas tinggi.",

                    relatedMajors: ["Manajemen Bisnis", "Sistem Informasi", "Ilmu Komputer", "Teknik Industri"],
                    careerProspect: {
                      jobAvailability: "high",
                      salaryPotential: "high",
                      careerProgression: "high",
                      industryGrowth: "high",
                      skillDevelopment: "super high",
                      aiOvertake: "low"
                    }
                  }
                ],
                insights: [
                  "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
                  "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
                  "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
                  "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
                  "Tetapkan batas waktu untuk menghindari analisis berlebihan"
                ],
                skillSuggestion: [
                  "Public Speaking",
                  "Leadership",
                  "Teamwork",
                  "Time Management",
                  "Delegation"
                ],
                possiblePitfalls: [
                  "Mengisolasi diri dari tim karena terlalu fokus pada analisis individu",
                  "Menunda keputusan karena perfeksionisme berlebihan",
                  "Kurang membangun jaringan karena terlalu fokus pada teknis",
                  "Terlalu fokus pada teknis hingga mengabaikan komunikasi",
                  "Risiko burnout karena beban proyek dan standar tinggi"
                ],
                riskTolerance: "moderate",
                workEnvironment: "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
                roleModel: [
                  { name: "Marie Curie", title: "Physicist/Chemist, Nobel Laureate" },
                  { name: "Albert Einstein", title: "Theoretical Physicist, Nobel Laureate" },
                  { name: "B.J. Habibie", title: "Former President of Indonesia, Engineer" }
                ],
                developmentActivities: {
                  extracurricular: ["Klub Robotik", "Olimpiade Sains Nasional (OSN)", "Klub Debat Bahasa Inggris"],
                  bookRecommendations: [
                    {
                      title: "Sapiens: A Brief History of Humankind",
                      author: "Yuval Noah Harari",
                      reason: "Untuk memuaskan rasa ingin tahu intelektualmu yang tinggi."
                    },
                    {
                      title: "Thinking, Fast and Slow",
                      author: "Daniel Kahneman",
                      reason: "Untuk memahami bias kognitif dan mempertajam analisismu."
                    }
                  ]
                }
              },
              status: "completed",
              error_message: null,
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-15T10:30:00.000Z",
              updated_at: "2024-01-15T10:35:00.000Z"
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 50,
            totalPages: 5
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/archive/results?page=1&limit=10&sort=created_at&order=DESC" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/results/:id",
      title: "Get Specific Result",
      description: "Mendapatkan detail hasil analisis berdasarkan ID. Mendukung akses public untuk hasil yang dibagikan.",
      authentication: "Optional (Required for private results, not required for public results)",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "id",
          type: "UUID",
          required: true,
          description: "ID hasil analisis"
        }
      ],
      // Field Descriptions:
      // - test_data: Object - Data test/assessment lengkap (contoh: RIASEC, OCEAN, VIA-IS, IQ, dll)
      // - test_result: Object - Hasil analisis generik (contoh: archetype, rekomendasi, dsb.)
      // - raw_responses: Object|null - Jawaban mentah tingkat item (jika disimpan)
      // - status: String - Status hasil analisis ('completed', 'processing', 'failed')
      // - error_message: String|null - Pesan error jika status 'failed'
      // - assessment_name: String - Nama assessment
      // - is_public: Boolean - Status public hasil analisis (true = dapat diakses publik)
      // - chatbot_id: UUID|null - ID conversation chatbot yang terkait dengan hasil analisis
      // - created_at: String - Timestamp pembuatan
      // - updated_at: String - Timestamp update terakhir
      response: {
        success: true,
        data: {
          id: "uuid",
          user_id: "uuid",
          test_data: {
            riasec: {
              realistic: 75,
              investigative: 85,
              artistic: 65,
              social: 70,
              enterprising: 80,
              conventional: 60
            },
            ocean: {
              openness: 88,
              conscientiousness: 75,
              extraversion: 72,
              agreeableness: 85,
              neuroticism: 35
            },
            viaIs: {
              creativity: 82,
              curiosity: 90,
              judgment: 78,
              loveOfLearning: 95,
              perspective: 75,
              bravery: 68,
              perseverance: 85,
              honesty: 88,
              zest: 76,
              love: 82,
              kindness: 87,
              socialIntelligence: 74,
              teamwork: 79,
              fairness: 86,
              leadership: 72,
              forgiveness: 77,
              humility: 81,
              prudence: 73,
              selfRegulation: 84,
              appreciationOfBeauty: 69,
              gratitude: 89,
              hope: 83,
              humor: 71,
              spirituality: 58
            }
          },
          test_result: {
            archetype: "The Analytical Innovator",
            coreMotivators: [
              "Problem-Solving",
              "Learning & Mastery",
              "Creative Expression",
              "Impact & Contribution"
            ],
            learningStyle: "Visual & Kinesthetic (Belajar paling baik dengan melihat contoh dan langsung mencoba)",
            shortSummary: "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif.",
            strengthSummary: "Kekuatan utama Anda terletak pada analisis mendalam, kreativitas, dan dorongan kuat untuk belajar hal baru. Ini membuat Anda mampu menghasilkan solusi unik di berbagai situasi kompleks.",
            strengths: [
              "Kemampuan analisis yang tajam",
              "Kreativitas dan inovasi",
              "Keingintahuan intelektual yang tinggi",
              "Kemampuan belajar mandiri yang kuat",
              "Pemikiran sistematis dan terstruktur"
            ],
            weaknessSummary: "Anda cenderung overthinking, perfeksionis, dan kadang kurang sabar menghadapi proses lambat atau bekerja sama dengan orang lain.",
            weaknesses: [
              "Terkadang terlalu perfeksionis",
              "Dapat terjebak dalam overthinking",
              "Kurang sabar dengan proses yang lambat",
              "Kemampuan sosial yang perlu dikembangkan",
              "Kesulitan mendelegasikan tugas"
            ],
            careerRecommendation: [
              {
                careerName: "Data Scientist",
                justification: "Sangat cocok karena menggabungkan kekuatan analitis (OCEAN: Conscientiousness) dan minat investigatif (RIASEC: Investigative) Anda. Peran ini memungkinkan Anda memecahkan masalah kompleks menggunakan data, yang sejalan dengan arketipe 'Analytical Innovator'.",
                firstSteps: [
                  "Ikuti kursus online 'Intro to Python for Data Science'",
                  "Coba analisis dataset sederhana dari Kaggle.com",
                  "Tonton video 'Day in the Life of a Data Scientist' di YouTube"
                ],
                relatedMajors: ["Statistika", "Ilmu Komputer", "Matematika", "Sistem Informasi"],
                careerProspect: {
                  jobAvailability: "high",
                  salaryPotential: "high",
                  careerProgression: "high",
                  industryGrowth: "super high",
                  skillDevelopment: "super high",
                  aiOvertake: "moderate"
                }
              },
              {
                careerName: "Peneliti",
                justification: "Minat investigatif yang tinggi dan keterbukaan terhadap pengalaman baru membuat Anda cocok untuk dunia penelitian. Kemampuan analitis mendalam mendukung proses riset yang sistematis.",
                firstSteps: [
                  "Bergabung dengan program penelitian siswa di sekolah",
                  "Baca jurnal ilmiah populer seperti Scientific American",
                  "Ikuti webinar tentang metodologi penelitian"
                ],
                relatedMajors: ["Psikologi", "Biologi", "Fisika", "Kimia", "Sosiologi"],
                careerProspect: {
                  jobAvailability: "moderate",
                  salaryPotential: "moderate",
                  careerProgression: "moderate",
                  industryGrowth: "moderate",
                  skillDevelopment: "high",
                  aiOvertake: "low"
                }
              },
              {
                careerName: "Pengembang Software",
                justification: "Kombinasi kreativitas dan kemampuan analitis yang kuat sangat sesuai untuk pengembangan software. Keterbukaan terhadap teknologi baru mendukung adaptasi di industri yang dinamis.",
                firstSteps: [
                  "Mulai belajar bahasa pemrograman Python atau JavaScript",
                  "Buat proyek sederhana seperti kalkulator atau to-do list",
                  "Bergabung dengan komunitas programmer lokal atau online"
                ],
                relatedMajors: ["Teknik Informatika", "Ilmu Komputer", "Sistem Informasi", "Teknik Komputer"],
                careerProspect: {
                  jobAvailability: "super high",
                  salaryPotential: "high",
                  careerProgression: "high",
                  industryGrowth: "super high",
                  skillDevelopment: "super high",
                  aiOvertake: "moderate"
                }
              },
              {
                careerName: "Product Manager",
                justification: "Menggabungkan kemampuan analitis, komunikasi, dan kepemimpinan untuk memimpin pengembangan produk yang berdampak. Cocok bagi profil dengan kombinasi Investigative-Enterprising dan kreativitas tinggi.",
                firstSteps: [
                  "Pelajari dasar-dasar manajemen produk (PM 101) melalui kursus online",
                  "Buat studi kasus produk: analisis problem, solusi, dan metrik",
                  "Ikuti komunitas Product Management lokal/online"
                ],
                relatedMajors: ["Manajemen Bisnis", "Sistem Informasi", "Ilmu Komputer", "Teknik Industri"],
                careerProspect: {
                  jobAvailability: "high",
                  salaryPotential: "high",
                  careerProgression: "high",
                  industryGrowth: "high",
                  skillDevelopment: "super high",
                  aiOvertake: "low"
                }
              }
            ],
            insights: [
              "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
              "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
              "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
              "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
              "Tetapkan batas waktu untuk menghindari analisis berlebihan"
            ],
            skillSuggestion: [
              "Public Speaking",
              "Leadership",
              "Teamwork",
              "Time Management",
              "Delegation"
            ],
            possiblePitfalls: [
              "Mengisolasi diri dari tim karena terlalu fokus pada analisis individu",
              "Menunda keputusan karena perfeksionisme berlebihan",
              "Kurang membangun jaringan karena terlalu fokus pada teknis",
              "Terlalu fokus pada teknis hingga mengabaikan komunikasi",
              "Risiko burnout karena beban proyek dan standar tinggi"
            ],
            riskTolerance: "moderate",
            workEnvironment: "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
            roleModel: [
              { name: "Marie Curie", title: "Physicist/Chemist, Nobel Laureate" },
              { name: "Albert Einstein", title: "Theoretical Physicist, Nobel Laureate" },
              { name: "B.J. Habibie", title: "Former President of Indonesia, Engineer" }
            ],
            developmentActivities: {
              extracurricular: ["Klub Robotik", "Olimpiade Sains Nasional (OSN)", "Klub Debat Bahasa Inggris"],
              bookRecommendations: [
                {
                  title: "Sapiens: A Brief History of Humankind",
                  author: "Yuval Noah Harari",
                  reason: "Untuk memuaskan rasa ingin tahu intelektualmu yang tinggi."
                },
                {
                  title: "Thinking, Fast and Slow",
                  author: "Daniel Kahneman",
                  reason: "Untuk memahami bias kognitif dan mempertajam analisismu."
                }
              ]
            }
          },
          status: "completed",
          error_message: null,
          assessment_name: "AI-Driven Talent Mapping",
          is_public: false,
          chatbot_id: "uuid (optional) - ID conversation chatbot yang terkait dengan hasil analisis ini",
          created_at: "timestamp",
          updated_at: "timestamp"
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# For public results (no authentication required):
curl -X GET https://api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000`
    },
    {
      method: "PUT",
      path: "/api/archive/results/:id",
      title: "Update Result",
      description: "Memperbarui hasil analisis (hanya pemilik atau admin). Dapat mengaitkan hasil analisis dengan conversation chatbot menggunakan chatbot_id.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "id",
          type: "UUID",
          required: true,
          description: "ID hasil analisis"
        }
      ],
      requestBody: {
        test_data: "Object - Data test yang diperbarui",
        test_result: "Object - Hasil analisis yang diperbarui",
        status: "String - Status hasil analisis",
        chatbot_id: "UUID (optional) - ID conversation chatbot untuk mengaitkan dengan hasil analisis"
      },
      response: {
        success: true,
        message: "Result updated successfully",
        data: {
          id: "uuid",
          updated_at: "timestamp"
        }
      },
      example: `curl -X PUT https://api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed", "chatbot_id": "a9d070c8-177d-473a-9156-7dab4ea43e5c", "test_data": {...}, "test_result": {...}}'`
    },
    {
      method: "PATCH",
      path: "/api/archive/results/:id/public",
      title: "Toggle Public Status",
      description: "Mengubah status public/private dari hasil analisis untuk memungkinkan sharing.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "id",
          type: "UUID",
          required: true,
          description: "ID hasil analisis"
        }
      ],
      requestBody: {
        is_public: "Boolean - Status public hasil analisis (true = public, false = private)"
      },
      response: {
        success: true,
        message: "Analysis result made public/private successfully",
        data: {
          id: "uuid",
          is_public: true
        }
      },
      example: `curl -X PATCH https://api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000/public \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"is_public": true}'`
    },
    {
      method: "GET",
      path: "/api/archive/jobs",
      title: "Get User Jobs with Archetype Data",
      description: "Mendapatkan daftar job analisis untuk user yang terautentikasi beserta archetype dari hasil analisis.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "Halaman data (default: 1)"
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "Jumlah data per halaman (default: 10)"
        },
        {
          name: "status",
          type: "string",
          required: false,
          description: "Filter berdasarkan status: 'queued', 'processing', 'completed', 'failed'"
        },
        {
          name: "assessment_name",
          type: "string",
          required: false,
          description: "Filter berdasarkan nama assessment"
        },
        {
          name: "sort",
          type: "string",
          required: false,
          description: "Field untuk sorting (default: 'created_at')"
        },
        {
          name: "order",
          type: "string",
          required: false,
          description: "Urutan sorting (default: 'DESC')"
        }
      ],
      response: {
        success: true,
        message: "Jobs retrieved successfully",
        data: {
          jobs: [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              job_id: "job_12345abcdef",
              user_id: "550e8400-e29b-41d4-a716-446655440001",
              status: "processing",
              result_id: null,
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-15T10:30:00.000Z",
              updated_at: "2024-01-15T10:32:00.000Z",
              completed_at: null,
              error_message: null,
              priority: 0,
              retry_count: 0,
              max_retries: 3,
              processing_started_at: "2024-01-15T10:31:00.000Z",
              archetype: null
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440002",
              job_id: "job_67890ghijkl",
              user_id: "550e8400-e29b-41d4-a716-446655440001",
              status: "completed",
              result_id: "550e8400-e29b-41d4-a716-446655440003",
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-14T09:15:00.000Z",
              updated_at: "2024-01-14T09:18:00.000Z",
              completed_at: "2024-01-14T09:18:00.000Z",
              error_message: null,
              priority: 0,
              retry_count: 0,
              max_retries: 3,
              processing_started_at: "2024-01-14T09:16:00.000Z",
              archetype: "The Analytical Innovator"
            }
          ],
          pagination: {
            total: 25,
            limit: 10,
            offset: 0,
            hasMore: true
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/archive/jobs?status=completed&page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/jobs/:jobId",
      title: "Get Job with Archetype Data",
      description: "Mendapatkan detail job berdasarkan job ID beserta archetype dari hasil analisis.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "ID job"
        }
      ],
      response: {
        success: true,
        message: "Job retrieved successfully",
        data: {
          id: "550e8400-e29b-41d4-a716-446655440001",
          job_id: "job_12345abcdef",
          user_id: "550e8400-e29b-41d4-a716-446655440001",
          status: "completed",
          result_id: "550e8400-e29b-41d4-a716-446655440003",
          assessment_name: "AI-Driven Talent Mapping",
          created_at: "2024-01-15T10:30:00.000Z",
          updated_at: "2024-01-15T10:35:00.000Z",
          completed_at: "2024-01-15T10:35:00.000Z",
          error_message: null,
          priority: 0,
          retry_count: 0,
          max_retries: 3,
          processing_started_at: "2024-01-15T10:31:00.000Z",
          archetype: "The Analytical Innovator"
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/archive/jobs/job_12345abcdef \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/jobs/stats",
      title: "Get Job Statistics",
      description: "Mendapatkan statistik job dengan dukungan dua mode autentikasi: user-specific atau system-wide.",
      authentication: "Flexible Authentication (User Token OR Internal Service)",
      rateLimit: "5000 requests per 15 minutes",
      authenticationOptions: [
        {
          type: "User Token",
          method: "Authorization: Bearer <token>",
          description: "Menampilkan statistik untuk user tertentu"
        },
        {
          type: "Internal Service",
          method: "X-Service-Key + X-Internal-Service: true",
          description: "Menampilkan statistik untuk semua jobs (system-wide)"
        }
      ],
      response: {
        success: true,
        message: "Job statistics retrieved successfully",
        timestamp: "2025-09-27T15:30:11.421Z",
        data: {
          total_jobs: 302,
          queued: 2,
          processing: 2,
          completed: 205,
          failed: 0,
          success_rate: 1.0,
          avg_processing_time_seconds: 332.60
        }
      },
      responseFields: [
        {
          field: "total_jobs",
          type: "integer",
          description: "Total jumlah jobs"
        },
        {
          field: "queued",
          type: "integer", 
          description: "Jobs yang masih dalam antrian"
        },
        {
          field: "processing",
          type: "integer",
          description: "Jobs yang sedang diproses"
        },
        {
          field: "completed",
          type: "integer",
          description: "Jobs yang berhasil diselesaikan"
        },
        {
          field: "failed",
          type: "integer",
          description: "Jobs yang gagal"
        },
        {
          field: "success_rate",
          type: "float",
          description: "Tingkat keberhasilan (0.0 - 1.0)"
        },
        {
          field: "avg_processing_time_seconds",
          type: "float",
          description: "Rata-rata waktu pemrosesan dalam detik"
        }
      ],
      examples: [
        {
          title: "User-specific statistics",
          code: `curl -X GET https://api.futureguide.id/api/archive/jobs/stats \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
        },
        {
          title: "System-wide statistics (Internal Service)",
          code: `curl -X GET https://api.futureguide.id/api/archive/jobs/stats \\
  -H "X-Service-Key: YOUR_SERVICE_KEY" \\
  -H "X-Internal-Service: true"`
        }
      ],
      testResults: {
        userAuthentication: "✅ WORKING - Shows stats for specific user",
        internalServiceAuthentication: "✅ WORKING - Shows stats for all jobs",
        successRateField: "✅ PRESENT - Field available and accurate",
        directServiceAccess: "✅ WORKING - Direct access to archive service functional",
        routingOrder: "✅ FIXED - Route placed before /:jobId to avoid parameter conflicts"
      }
    },
    {
      method: "DELETE",
      path: "/api/archive/jobs/:jobId",
      title: "Delete Job (Soft Delete)",
      description: "Menghapus/membatalkan job dengan soft delete. Job status akan diubah menjadi 'deleted' dan result terkait tidak dihapus.",
      authentication: "Bearer Token Required atau Internal Service",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "ID job"
        }
      ],
      response: {
        success: true,
        message: "Job deleted successfully",
        data: {
          deleted_job_id: "string",
          deleted_at: "timestamp",
          status: "deleted",
          result_preserved: true
        }
      },
      example: `curl -X DELETE https://api.futureguide.id/api/archive/jobs/job_12345abcdef \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      notes: [
        "Soft delete job dengan mengubah status menjadi 'deleted'",
        "Result terkait tetap dipertahankan dan dapat diakses",
        "Job dengan status 'deleted' tidak ditampilkan dalam listing normal",
        "Menggunakan transaction untuk memastikan atomicity",
        "Tidak dapat menghapus job yang sedang 'processing'"
      ]
    },
    {
      method: "POST",
      path: "/api/archive/jobs/:jobId/sync-status",
      title: "Sync Job-Result Status",
      description: "Sinkronisasi status antara job dan result untuk memastikan konsistensi data. Internal service only.",
      authentication: "Internal Service Only",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "jobId",
          type: "string",
          required: true,
          description: "ID job yang akan disinkronisasi"
        }
      ],
      response: {
        success: true,
        message: "Job-result status synchronized successfully",
        data: {
          jobId: "job-123",
          syncActions: ["synced_result_status_processing_to_completed"],
          orphanedResultsCleared: 0,
          success: true
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/archive/jobs/job_12345abcdef/sync-status \\
  -H "Authorization: Internal-Service"`,
      statusMapping: {
        "queued": "processing",
        "processing": "processing", 
        "completed": "completed",
        "failed": "failed",
        "cancelled": "failed"
      },
      notes: [
        "Hanya dapat diakses oleh internal service",
        "Melakukan mapping status sesuai business rules",
        "Membersihkan orphaned result_id dari job",
        "Return detail sync actions yang dilakukan"
      ]
    },
    {
      method: "POST", 
      path: "/api/archive/jobs/cleanup-orphaned",
      title: "Cleanup Orphaned Jobs",
      description: "Membersihkan job yang result_id-nya tidak valid/tidak ada. Internal service only.",
      authentication: "Internal Service Only",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Orphaned jobs cleanup completed",
        data: {
          success: true,
          deletedCount: 5,
          deletedJobIds: ["job-123", "job-456"],
          message: "Successfully deleted 5 orphaned jobs"
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/archive/jobs/cleanup-orphaned \\
  -H "Authorization: Internal-Service"`,
      notes: [
        "Hanya dapat diakses oleh internal service",
        "Menghapus job yang memiliki result_id tidak valid",
        "Return statistik cleanup yang dilakukan",
        "Membantu menjaga konsistensi database"
      ]
    },
    {
      method: "GET",
      path: "/api/archive/stats",
      title: "Get User Statistics",
      description: "Mendapatkan statistik untuk user yang terautentikasi.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Statistics retrieved successfully",
        data: {
          total_results: 25,
          total_jobs: 30,
          completed_assessments: 25,
          archetype_distribution: {
            "The Analytical Innovator": 8,
            "The Creative Collaborator": 6,
            "The Strategic Leader": 4,
            "The Empathetic Helper": 7
          },
          recent_activity: [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              archetype: "The Analytical Innovator",
              created_at: "2024-01-15T10:30:00.000Z",
              status: "completed"
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440002",
              archetype: "The Creative Collaborator",
              created_at: "2024-01-14T15:20:00.000Z",
              status: "completed"
            }
          ]
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/archive/stats \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/stats/overview",
      title: "Get User Overview",
      description: "Mendapatkan overview statistik untuk dashboard user.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Overview retrieved successfully",
        data: {
          summary: {
            total_assessments: 25,
            this_month: 5,
            success_rate: 0.96
          },
          recent_results: [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              archetype: "The Analytical Innovator",
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-15T10:30:00.000Z",
              status: "completed"
            }
          ],
          archetype_summary: {
            most_common: "The Analytical Innovator",
            frequency: 3,
            last_archetype: "The Creative Collaborator",
            unique_archetypes: 4,
            archetype_trend: "consistent"
          }
        }
      },
      example: `curl -X GET https://api.futureguide.id/api/archive/stats/overview \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/v1/stats",
      title: "Unified Statistics",
      description: "Endpoint statistik terpadu dengan parameter fleksibel.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "type",
          type: "string",
          required: false,
          description: "Tipe statistik: user, system, demographic, performance"
        },
        {
          name: "scope",
          type: "string",
          required: false,
          description: "Scope: overview, detailed, analysis, summary"
        },
        {
          name: "timeRange",
          type: "string",
          required: false,
          description: "Rentang waktu: '1 day', '7 days', '30 days', '90 days'"
        }
      ],
      response: {
        success: true,
        message: "Unified statistics retrieved successfully",
        data: "Varies based on parameters"
      },
      example: `curl -X GET "https://api.futureguide.id/api/archive/v1/stats?type=user&scope=overview&timeRange=30 days" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/v1/data/:type",
      title: "Unified Data Retrieval",
      description: "Endpoint pengambilan data terpadu.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "type",
          type: "string",
          required: true,
          description: "Tipe data: results, jobs, demographics"
        },
        {
          name: "page",
          type: "number",
          required: false,
          description: "Halaman data (default: 1)"
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "Jumlah data per halaman (default: 10)"
        },
        {
          name: "sort",
          type: "string",
          required: false,
          description: "Field untuk sorting"
        },
        {
          name: "order",
          type: "string",
          required: false,
          description: "Urutan sorting"
        }
      ],
      response: {
        success: true,
        message: "Data retrieved successfully",
        data: "Varies based on type parameter"
      },
      example: `curl -X GET "https://api.futureguide.id/api/archive/v1/data/results?page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "DELETE",
      path: "/api/archive/admin/users/:userId",
      title: "Delete User (Admin)",
      description: "Admin endpoint untuk menghapus user dengan soft delete. Hanya dapat diakses oleh admin dengan role 'admin' atau 'superadmin'.",
      authentication: "Admin Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "userId",
          type: "UUID",
          required: true,
          description: "ID user yang akan dihapus"
        }
      ],
      response: {
        success: true,
        message: "User deleted successfully",
        data: {
          deletedUserId: "550e8400-e29b-41d4-a716-446655440000",
          originalEmail: "user@example.com",
          newEmail: "deleted_1705312200_user@example.com",
          deletedAt: "2024-01-15T10:30:00.000Z",
          deletedBy: {
            adminId: "550e8400-e29b-41d4-a716-446655440001",
            adminUsername: "admin_user"
          }
        }
      },
      errorResponses: [
        {
          code: "USER_NOT_FOUND",
          status: 404,
          message: "User not found"
        },
        {
          code: "UNAUTHORIZED",
          status: 401,
          message: "Admin authentication required"
        },
        {
          code: "FORBIDDEN",
          status: 403,
          message: "Insufficient admin privileges"
        }
      ],
      example: `curl -X DELETE https://api.futureguide.id/api/archive/admin/users/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/health",
      title: "Service Health",
      description: "Mengecek status kesehatan service (tidak memerlukan autentikasi).",
      authentication: "None",
      rateLimit: "No limit",
      response: {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00.000Z",
        database: "connected",
        version: "1.0.0",
        service: "archive-service"
      },
      example: `curl -X GET https://api.futureguide.id/api/archive/health`
    }
  ],
  errorResponses: {
    standardFormat: {
      success: false,
      error: {
        code: "ERROR_CODE",
        message: "Human readable error message",
        details: {}
      }
    },
    commonErrors: [
      {
        code: "UNAUTHORIZED",
        status: 401,
        message: "Token tidak valid atau tidak ada"
      },
      {
        code: "FORBIDDEN",
        status: 403,
        message: "Akses ditolak"
      },
      {
        code: "NOT_FOUND",
        status: 404,
        message: "Resource tidak ditemukan"
      },
      {
        code: "VALIDATION_ERROR",
        status: 400,
        message: "Data input tidak valid"
      },
      {
        code: "RATE_LIMIT_EXCEEDED",
        status: 429,
        message: "Terlalu banyak request"
      },
      {
        code: "INTERNAL_ERROR",
        status: 500,
        message: "Server error"
      }
    ]
  },
  notes: [
    "Pagination: Semua endpoint list menggunakan pagination dengan format standar",
    "Sorting: Field sorting yang didukung: created_at, updated_at, status",
    "Filtering: Beberapa endpoint mendukung filtering berdasarkan status dan parameter lainnya",
    "Rate Limiting: Semua endpoint tunduk pada rate limiting gateway",
    "CORS: Service mendukung CORS untuk akses dari frontend",
    "Compression: Response otomatis dikompresi untuk menghemat bandwidth",
    "Enhanced Jobs Endpoints: /api/archive/jobs dan /api/archive/jobs/:jobId sekarang hanya mengembalikan field archetype dari test_result untuk mengurangi ukuran response",
    "Empty Results Handling: Jika job belum selesai atau gagal, field archetype akan bernilai null",
    "Simplified Response: Hanya archetype yang dikembalikan dari test_result untuk mengoptimalkan performa dan mengurangi transfer data",
    "Flexible Authentication: Endpoint /api/archive/jobs/stats mendukung dua mode autentikasi - user token untuk statistik personal dan internal service untuk statistik system-wide",
    "Routing Order Fix: Route /stats telah dipindahkan sebelum route /:jobId untuk menghindari konflik parameter routing",
    "API Gateway Enhancement: Ditambahkan flexible authentication di API Gateway yang mendukung baik user token maupun internal service authentication",
    "Production Ready: Endpoint /api/archive/jobs/stats telah berhasil dikonfigurasi dan ditest dengan success rate 100% untuk user stats dan 88.49% untuk system stats",
    "Status Consistency: Results sekarang mendukung semua status job (queued, processing, completed, failed, cancelled) untuk konsistensi data",
    "Cascade Delete: Delete job akan cascade delete result terkait, delete result akan cascade delete job terkait",
    "Orphaned Data Cleanup: Sistem otomatis membersihkan job dengan result_id yang tidak valid",
    "Status Synchronization: Endpoint khusus untuk sinkronisasi status antara job dan result",
    "Transaction Safety: Semua operasi delete menggunakan database transaction untuk atomicity",
    "Internal Service Endpoints: Endpoint sync-status dan cleanup-orphaned hanya dapat diakses internal service",
    "Database Migration: Kolom status, error_message, dan assessment_name telah dipindahkan dari analysis_results ke analysis_jobs untuk normalisasi data",
    "JOIN Implementation: Endpoint results menggunakan LEFT JOIN dengan analysis_jobs untuk mendapatkan status, error_message, dan assessment_name",
    "Backward Compatibility: Response format tetap sama dengan mengembalikan field status dan assessment_name di level result untuk kompatibilitas"
  ],
  personaProfileSchema: {
    description: "Skema lengkap persona_profile (semua field wajib ada) sesuai spesifikasi terbaru",
    fields: {
      archetype: { type: "String", required: true },
      coreMotivators: {
        type: "Array[String]",
        required: true,
        items: "String",
        length: 4,
        description: "4 motivasi inti yang mendorong tindakan siswa"
      },
      learningStyle: { type: "String", required: true },
      shortSummary: { type: "String", required: true },
      strengthSummary: { type: "String", required: true },
      strengths: {
        type: "Array[String]",
        required: true,
        minItems: 4,
        maxItems: 6
      },
      weaknessSummary: { type: "String", required: true },
      weaknesses: {
        type: "Array[String]",
        required: true,
        minItems: 4,
        maxItems: 5
      },
      careerRecommendation: {
        type: "Array[Object]",
        required: true,
        length: 4,
        description: "4 rekomendasi karir yang umum dikenal (hindari jabatan niche/sangat spesifik)",
        itemProperties: {
          careerName: { type: "String", required: true, note: "Gunakan pekerjaan umum yang dikenal luas" },
          justification: { type: "String", required: true },
          relatedMajors: { type: "Array[String]", required: true, minItems: 4, maxItems: 5, note: "Hanya nama jurusan" },
          careerProspect: {
            type: "Object", required: true, properties: {
              jobAvailability: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true },
              salaryPotential: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true },
              careerProgression: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true },
              industryGrowth: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true },
              skillDevelopment: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true },
              aiOvertake: { type: "String", enum: ["super high", "high", "moderate", "low", "super low"], required: true }
            }
          }
        }
      },
      insights: { type: "Array[String]", required: true, minItems: 4, maxItems: 5 },
      skillSuggestion: { type: "Array[String]", required: true, minItems: 4, maxItems: 6 },
      possiblePitfalls: { type: "Array[String]", required: true, minItems: 4, maxItems: 5 },
      riskTolerance: { type: "String", required: true, enum: ["very high", "high", "moderate", "low", "very low"] },
      workEnvironment: { type: "String", required: true },
      roleModel: { type: "Array[Object]", required: true, minItems: 2, maxItems: 3, itemProperties: { name: "String", title: "String" } },
      developmentActivities: {
        type: "Object",
        required: true,
        properties: {
          extracurricular: { type: "Array[String]", required: true, minItems: 2, maxItems: 3 },
          bookRecommendations: {
            type: "Array[Object]",
            required: true,
            minItems: 2,
            maxItems: 6,
            itemProperties: {
              title: "String",
              author: "String",
              reason: "String"
            }
          }
        },
        note: "Bagian projectIdeas telah DIHAPUS dari developmentActivities"
      }
    },
    totalFields: 16,
    notes: [
      "Role model sekarang wajib menyertakan title/jabatan",
      "Rekomendasi karir diarahkan ke pekerjaan yang umum dikenal",
      "careerProspect menambahkan aiOvertake dengan enum yang sama"
    ]
  }
};
