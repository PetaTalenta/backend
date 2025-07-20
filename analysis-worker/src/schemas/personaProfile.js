/**
 * Persona Profile Schema - Updated with Full Spec
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

  strengthSummary: Joi.string().required()
    .description('Ringkasan kekuatan utama persona (1 paragraf)'),

  strengths: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kekuatan/strength dari persona'),

  weaknessSummary: Joi.string().required()
    .description('Ringkasan kelemahan utama persona (1 paragraf)'),

  weaknesses: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar kelemahan/weakness dari persona'),

  careerRecommendation: Joi.array().items(
    Joi.object({
      careerName: Joi.string().required()
        .description('Nama karir atau profesi yang direkomendasikan'),
      careerProspect: Joi.object({
        jobAvailability: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Sejauh mana lapangan pekerjaan tersedia di bidang tersebut'),
        salaryPotential: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Potensi pendapatan dari profesi tersebut'),
        careerProgression: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Peluang naik jabatan atau spesialisasi di bidang tersebut'),
        industryGrowth: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Pertumbuhan industri terkait profesi ini di masa depan'),
        skillDevelopment: Joi.string().valid('super high', 'high', 'moderate', 'low', 'super low').required()
          .description('Peluang mengembangkan keahlian di profesi ini')
      }).required()
    })
  ).min(3).max(5).required()
    .description('Daftar rekomendasi karir yang sesuai dengan persona'),

  insights: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Daftar insight atau saran pengembangan diri'),

  skillSuggestion: Joi.array().items(Joi.string()).min(3).max(5).required()
    .description('Rekomendasi pengembangan skill jangka pendek dan menengah'),

  possiblePitfalls: Joi.array().items(Joi.string()).min(2).max(5).required()
    .description('Kesalahan atau jebakan karir yang perlu diwaspadai'),

  riskTolerance: Joi.string().valid('very high', 'high', 'moderate', 'low', 'very low').required()
    .description('Seberapa tinggi toleransi risiko persona dalam karir dan pekerjaan'),

  workEnvironment: Joi.string().required()
    .description('Deskripsi lingkungan kerja yang ideal untuk persona'),

  roleModel: Joi.array().items(Joi.string()).min(2).max(3).required()
    .description('Daftar role model yang relevan dan inspiratif')

}).required();

/**
 * Example persona profile
 */
const personaProfileExample = {
  archetype: "The Analytical Innovator",
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
  ]
};

module.exports = {
  personaProfileSchema,
  personaProfileExample
};
