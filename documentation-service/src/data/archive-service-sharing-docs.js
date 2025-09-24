export const archiveServiceSharingDocs = {
  title: "Archive Service - Sharing Feature Documentation",
  sections: [
    {
      title: "Public Result Sharing",
      emoji: "🎯",
      content: "Fitur ini memungkinkan pengguna untuk membagikan hasil analisis assessment mereka secara publik melalui link yang dapat diakses tanpa autentikasi."
    },
    {
      title: "Overview",
      subsections: [
        {
          title: "Default Behavior",
          content: [
            "Semua hasil analisis bersifat private secara default",
            "Hanya pemilik yang dapat mengakses hasil analisis private",
            "Diperlukan JWT token untuk mengakses hasil private"
          ]
        },
        {
          title: "Public Sharing",
          content: [
            "Pemilik dapat mengubah status hasil menjadi public",
            "Hasil public dapat diakses oleh siapa saja tanpa autentikasi",
            "Pemilik dapat mengubah kembali ke private kapan saja"
          ]
        }
      ]
    },
    {
      title: "API Endpoints",
      subsections: [
        {
          title: "Toggle Public Status",
          method: "PATCH",
          path: "/api/archive/results/:id/public",
          description: "Mengubah status public/private hasil analisis",
          authentication: "Required (Bearer Token)",
          requestBody: {
            is_public: "Boolean - Status public hasil analisis"
          },
          response: {
            success: true,
            message: "Analysis result made public/private successfully",
            data: {
              id: "uuid",
              is_public: true
            }
          }
        },
        {
          title: "Access Result",
          method: "GET",
          path: "/api/archive/results/:id",
          description: "Mengakses hasil analisis berdasarkan ID",
          authentication: "Optional (Required for private, not for public)",
          response: {
            success: true,
            data: {
              id: "uuid",
              user_id: "uuid",
              assessment_data: "{...}",
              persona_profile: "{...}",
              status: "completed",
              assessment_name: "AI-Driven Talent Mapping",
              is_public: false,
              created_at: "timestamp",
              updated_at: "timestamp"
            }
          }
        }
      ]
    },
    {
      title: "Security & Access Control",
      subsections: [
        {
          title: "Owner Control",
          content: [
            "Hanya pemilik hasil analisis yang dapat mengubah status public/private",
            "Sistem memverifikasi ownership melalui JWT token"
          ]
        },
        {
          title: "Data Protection",
          content: [
            "Hasil private tetap terlindungi dengan autentikasi",
            "Public access hanya untuk hasil yang secara eksplisit dibuat public",
            "Tidak ada perubahan pada struktur data yang ada"
          ]
        }
      ]
    },
    {
      title: "Usage Examples",
      examples: [
        {
          title: "Membuat Hasil Public",
          code: `curl -X PATCH api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000/public \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"is_public": true}'`
        },
        {
          title: "Mengakses Hasil Public",
          code: `curl api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000`
        },
        {
          title: "Mengakses Hasil Private",
          code: `curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  api.futureguide.id/api/archive/results/550e8400-e29b-41d4-a716-446655440000`
        }
      ]
    },
    {
      title: "Use Cases",
      cases: [
        {
          title: "HR Recruitment",
          description: "HR dapat mengakses hasil kandidat yang dibagikan tanpa autentikasi"
        },
        {
          title: "Career Portfolio",
          description: "Kandidat dapat menampilkan hasil assessment di portfolio online"
        },
        {
          title: "Career Consultation",
          description: "Konsultan dapat mengakses hasil klien untuk konsultasi"
        }
      ]
    },
    {
      title: "Important Notes",
      notes: [
        {
          title: "Authentication Requirements",
          items: [
            "Making Public/Private: Always requires JWT token",
            "Accessing Private: Always requires JWT token",
            "Accessing Public: No authentication required"
          ]
        },
        {
          title: "Rate Limiting",
          items: [
            "All endpoints: 5000 requests per 15 minutes",
            "Applied per IP address for public access"
          ]
        }
      ]
    },
    {
      title: "Best Practices",
      practices: [
        {
          title: "For Users",
          items: [
            "Review Before Sharing: Always review hasil sebelum membuat public",
            "Regular Updates: Periodically review dan update status sharing",
            "Secure Links: Bagikan link dengan hati-hati"
          ]
        },
        {
          title: "For Developers",
          items: [
            "Validate Ownership: Always verify user ownership before status changes",
            "Log Activities: Log all sharing-related activities",
            "Rate Limiting: Implement appropriate rate limiting",
            "Error Handling: Provide clear error messages"
          ]
        }
      ]
    }
  ]
};
