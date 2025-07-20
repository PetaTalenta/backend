/**
 * Persona Profile Schema
 */

const Joi = require('joi');

/**
 * Schema for persona profile validation
 */
const personaProfileSchema = Joi.object({
  archetype: Joi.string().required()
    .description('Nama archetype yang paling sesuai dengan persona'),

  shortSummary: Joi.string().required()
    .description('Ringkasan singkat tentang persona (1-2 paragraf)'),

  strengths: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kekuatan/strength dari persona'),

  weaknesses: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kelemahan/weakness dari persona'),

  careerRecommendation: Joi.array().items(
    Joi.object({
      careerName: Joi.string().required()
        .description('Nama karir atau profesi yang direkomendasikan'),
      careerProspect: Joi.object({
        jobAvailability: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Menggambarkan sejauh mana lapangan pekerjaan tersedia di bidang tersebut'),
        salaryPotential: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Mengukur potensi pendapatan dari profesi tersebut'),
        careerProgression: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Menilai seberapa besar peluang seorang profesional naik ke posisi yang lebih tinggi'),
        industryGrowth: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Melihat apakah industri tempat profesi itu berada sedang berkembang'),
        skillDevelopment: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Menilai apakah profesi ini memungkinkan individu untuk mengembangkan keahlian')
      }).required()
    })
  ).min(3).max(5).required()
    .description('Daftar rekomendasi karir yang sesuai dengan persona'),

  insights: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar insight atau saran pengembangan diri'),

  workEnvironment: Joi.string().required()
    .description('Deskripsi lingkungan kerja yang ideal untuk persona'),

  roleModel: Joi.array().items(Joi.string()).min(4).max(5).required()
    .description('Daftar role model yang relevan dan inspiratif')
}).required();

/**
 * Example persona profile
 */
const personaProfileExample = {
  "archetype": "The Analytical Innovator",
  "shortSummary": "Anda adalah seorang pemikir analitis dengan kecenderungan investigatif yang kuat dan kreativitas tinggi. Kombinasi antara kecerdasan logis-matematis yang dominan dan keterbukaan terhadap pengalaman baru membuat Anda unggul dalam memecahkan masalah kompleks dengan pendekatan inovatif. Anda memiliki keingintahuan intelektual yang tinggi dan selalu mencari pengetahuan baru.",
  "strengths": [
    "Kemampuan analisis yang tajam",
    "Kreativitas dan inovasi",
    "Keingintahuan intelektual yang tinggi",
    "Kemampuan belajar mandiri yang kuat",
    "Pemikiran sistematis dan terstruktur"
  ],
  "weaknesses": [
    "Terkadang terlalu perfeksionis",
    "Dapat terjebak dalam overthinking",
    "Kurang sabar dengan proses yang lambat",
    "Kemampuan sosial yang perlu dikembangkan",
    "Kesulitan mendelegasikan tugas"
  ],
  "careerRecommendation": [
    {
      "careerName": "Data Scientist",
      "careerProspect": {
        "jobAvailability": "high",
        "salaryPotential": "high",
        "careerProgression": "high",
        "industryGrowth": "super high",
        "skillDevelopment": "super high"
      }
    },
    {
      "careerName": "Peneliti",
      "careerProspect": {
        "jobAvailability": "moderate",
        "salaryPotential": "moderate",
        "careerProgression": "moderate",
        "industryGrowth": "moderate",
        "skillDevelopment": "high"
      }
    },
    {
      "careerName": "Pengembang Software",
      "careerProspect": {
        "jobAvailability": "super high",
        "salaryPotential": "high",
        "careerProgression": "high",
        "industryGrowth": "super high",
        "skillDevelopment": "super high"
      }
    }
  ],
  "insights": [
    "Kembangkan keterampilan komunikasi untuk menyampaikan ide kompleks dengan lebih efektif",
    "Latih kemampuan bekerja dalam tim untuk mengimbangi kecenderungan bekerja sendiri",
    "Manfaatkan kekuatan analitis untuk memecahkan masalah sosial",
    "Cari mentor yang dapat membantu mengembangkan keterampilan kepemimpinan",
    "Tetapkan batas waktu untuk menghindari analisis berlebihan"
  ],
  "workEnvironment": "Lingkungan kerja yang ideal adalah tempat yang memberikan otonomi intelektual, menghargai inovasi, dan menyediakan tantangan kognitif yang berkelanjutan. Anda akan berkembang di lingkungan yang terstruktur namun fleksibel, dengan akses ke sumber daya penelitian dan pembelajaran yang memadai.",
  "roleModel": [
    "Marie Curie",
    "Albert Einstein",
    "Ada Lovelace",
    "Elon Musk",
    "B.J. Habibie"
  ]
};

module.exports = {
  personaProfileSchema,
  personaProfileExample
};
