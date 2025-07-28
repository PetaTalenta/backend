export const archiveServiceData = {
  name: "Archive Service",
  description: "Archive Service menyediakan API untuk mengelola hasil analisis assessment dan job tracking. API ini diakses melalui API Gateway pada port 3000 dengan prefix /api/archive/.",
  baseUrl: "http://localhost:3000/api/archive",
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
              assessment_data: {
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
                },
                assessmentName: "AI-Driven Talent Mapping"
              },
              persona_profile: {
                archetype: "The Analytical Innovator",
                coreMotivators: ["Problem-Solving", "Learning & Mastery", "Creative Expression"],
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
                      skillDevelopment: "super high"
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
                      skillDevelopment: "high"
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
                      skillDevelopment: "super high"
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
                  "Kurang membangun jaringan karena terlalu fokus pada teknis"
                ],
                riskTolerance: "moderate",
                workEnvironment: "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
                roleModel: [
                  "Marie Curie",
                  "Albert Einstein",
                  "B.J. Habibie"
                ],
                developmentActivities: {
                  extracurricular: ["Klub Robotik", "Olimpiade Sains Nasional (OSN)", "Klub Debat Bahasa Inggris"],
                  projectIdeas: [
                    "Membuat visualisasi data dari topik yang disukai (misal: statistik tim sepak bola favorit)",
                    "Mendesain aplikasi sederhana untuk memecahkan masalah di sekolah",
                    "Menulis blog yang menjelaskan konsep sains yang rumit dengan cara sederhana"
                  ],
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
      example: `curl -X GET "http://localhost:3000/api/archive/results?page=1&limit=10&sort=created_at&order=DESC" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/results/:id",
      title: "Get Specific Result",
      description: "Mendapatkan detail hasil analisis berdasarkan ID.",
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
      response: {
        success: true,
        data: {
          id: "uuid",
          user_id: "uuid",
          assessment_data: {
            assessmentName: "AI-Driven Talent Mapping",
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
          persona_profile: {
            archetype: "The Analytical Innovator",
            coreMotivators: ["Problem-Solving", "Learning & Mastery", "Creative Expression"],
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
                  skillDevelopment: "super high"
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
                  skillDevelopment: "high"
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
                  skillDevelopment: "super high"
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
              "Kurang membangun jaringan karena terlalu fokus pada teknis"
            ],
            riskTolerance: "moderate",
            workEnvironment: "Lingkungan kerja yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda berkembang di tempat yang terstruktur namun fleksibel.",
            roleModel: [
              "Marie Curie",
              "Albert Einstein",
              "B.J. Habibie"
            ],
            developmentActivities: {
              extracurricular: ["Klub Robotik", "Olimpiade Sains Nasional (OSN)", "Klub Debat Bahasa Inggris"],
              projectIdeas: [
                "Membuat visualisasi data dari topik yang disukai (misal: statistik tim sepak bola favorit)",
                "Mendesain aplikasi sederhana untuk memecahkan masalah di sekolah",
                "Menulis blog yang menjelaskan konsep sains yang rumit dengan cara sederhana"
              ],
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
          created_at: "timestamp",
          updated_at: "timestamp"
        }
      },
      example: `curl -X GET http://localhost:3000/api/archive/results/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "PUT",
      path: "/api/archive/results/:id",
      title: "Update Result",
      description: "Memperbarui hasil analisis (hanya pemilik atau admin).",
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
        assessment_data: "Object - Data assessment yang diperbarui",
        persona_profile: "Object - Profil persona yang diperbarui",
        status: "String - Status hasil analisis"
      },
      response: {
        success: true,
        message: "Result updated successfully",
        data: {
          id: "uuid",
          updated_at: "timestamp"
        }
      },
      example: `curl -X PUT http://localhost:3000/api/archive/results/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed", "assessment_data": {...}, "persona_profile": {...}}'`
    },
    {
      method: "GET",
      path: "/api/archive/jobs",
      title: "Get User Jobs",
      description: "Mendapatkan daftar job analisis untuk user yang terautentikasi.",
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
          description: "Filter berdasarkan status: 'pending', 'processing', 'completed', 'failed'"
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
              job_id: "job_12345abcdef",
              user_id: "550e8400-e29b-41d4-a716-446655440001",
              status: "processing",
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-15T10:30:00.000Z",
              updated_at: "2024-01-15T10:32:00.000Z",
              result_id: null
            },
            {
              job_id: "job_67890ghijkl",
              user_id: "550e8400-e29b-41d4-a716-446655440001",
              status: "completed",
              assessment_name: "AI-Driven Talent Mapping",
              created_at: "2024-01-14T09:15:00.000Z",
              updated_at: "2024-01-14T09:18:00.000Z",
              result_id: "550e8400-e29b-41d4-a716-446655440003"
            }
          ],
          total: 25
        }
      },
      example: `curl -X GET "http://localhost:3000/api/archive/jobs?status=completed&page=1&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/jobs/:jobId",
      title: "Get Job Status",
      description: "Mendapatkan status job berdasarkan job ID.",
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
          job_id: "string",
          user_id: "uuid",
          status: "processing",
          assessment_name: "string",
          created_at: "timestamp",
          updated_at: "timestamp",
          result_id: "uuid"
        }
      },
      example: `curl -X GET http://localhost:3000/api/archive/jobs/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/archive/jobs/stats",
      title: "Get Job Statistics",
      description: "Mendapatkan statistik job untuk user yang terautentikasi.",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      response: {
        success: true,
        message: "Job statistics retrieved successfully",
        data: {
          total_jobs: 50,
          pending: 5,
          processing: 2,
          completed: 40,
          failed: 3,
          success_rate: 0.94
        }
      },
      example: `curl -X GET http://localhost:3000/api/archive/jobs/stats \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "DELETE",
      path: "/api/archive/jobs/:jobId",
      title: "Delete Job",
      description: "Menghapus/membatalkan job (hanya pemilik).",
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
        message: "Job deleted successfully",
        data: {
          deleted_job_id: "string",
          deleted_at: "timestamp"
        }
      },
      example: `curl -X DELETE http://localhost:3000/api/archive/jobs/job_12345abcdef \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
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
      example: `curl -X GET http://localhost:3000/api/archive/stats \\
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
      example: `curl -X GET http://localhost:3000/api/archive/stats/overview \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "DELETE",
      path: "/api/archive/results/:resultId",
      title: "Delete Result",
      description: "Menghapus hasil analisis (hanya pemilik).",
      authentication: "Bearer Token Required",
      rateLimit: "5000 requests per 15 minutes",
      parameters: [
        {
          name: "resultId",
          type: "UUID",
          required: true,
          description: "ID hasil analisis"
        }
      ],
      response: {
        success: true,
        message: "Result deleted successfully",
        data: {
          deleted_result_id: "550e8400-e29b-41d4-a716-446655440000",
          deleted_at: "2024-01-15T10:30:00.000Z"
        }
      },
      example: `curl -X DELETE http://localhost:3000/api/archive/results/550e8400-e29b-41d4-a716-446655440000 \\
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
      example: `curl -X GET "http://localhost:3000/api/archive/v1/stats?type=user&scope=overview&timeRange=30 days" \\
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
      example: `curl -X GET "http://localhost:3000/api/archive/v1/data/results?page=1&limit=10" \\
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
      example: `curl -X DELETE http://localhost:3000/api/archive/admin/users/550e8400-e29b-41d4-a716-446655440000 \\
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
      example: `curl -X GET http://localhost:3000/api/archive/health`
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
    "Compression: Response otomatis dikompresi untuk menghemat bandwidth"
  ],
  personaProfileSchema: {
    description: "Struktur lengkap persona_profile dengan field-field baru yang telah ditambahkan",
    newFields: {
      coreMotivators: {
        type: "Array[String]",
        required: true,
        minItems: 2,
        maxItems: 4,
        description: "Fundamental drivers atau motivasi inti dari persona yang mengidentifikasi 'mengapa' di balik tindakan siswa"
      },
      learningStyle: {
        type: "String",
        required: true,
        description: "Gaya belajar yang paling efektif untuk persona, menjelaskan cara terbaik siswa menyerap informasi baru"
      },
      careerRecommendationEnhancements: {
        justification: {
          type: "String",
          required: true,
          description: "Penjelasan mengapa karir ini cocok berdasarkan data psikometrik (OCEAN, RIASEC, VIA-IS) dan arketipe persona"
        },
        firstSteps: {
          type: "Array[String]",
          required: true,
          minItems: 2,
          maxItems: 4,
          description: "Langkah konkret, immediate, dan low-barrier yang bisa diambil siswa SMA untuk mengeksplorasi karir ini"
        },
        relatedMajors: {
          type: "Array[String]",
          required: true,
          minItems: 2,
          maxItems: 5,
          description: "Jurusan kuliah yang relevan dengan karir ini, menciptakan jembatan dari SMA ke perencanaan pendidikan tinggi"
        }
      },
      developmentActivities: {
        type: "Object",
        required: true,
        description: "Aktivitas pengembangan yang disesuaikan dengan konteks siswa SMA",
        properties: {
          extracurricular: {
            type: "Array[String]",
            required: true,
            minItems: 2,
            maxItems: 4,
            description: "Kegiatan ekstrakurikuler yang disarankan (klub sekolah atau aktivitas)"
          },
          projectIdeas: {
            type: "Array[String]",
            required: true,
            minItems: 2,
            maxItems: 4,
            description: "Ide proyek konkret untuk membangun portfolio dan skills"
          },
          bookRecommendations: {
            type: "Array[Object]",
            required: true,
            minItems: 2,
            maxItems: 3,
            description: "Rekomendasi buku dengan alasan spesifik mengapa cocok untuk persona",
            itemProperties: {
              title: "String - Judul buku",
              author: "String - Nama penulis",
              reason: "String - Alasan mengapa buku ini cocok untuk persona"
            }
          }
        }
      }
    },
    totalFields: 16,
    previousFields: 13,
    addedFields: 3
  }
};
