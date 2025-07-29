

const logger = require('../utils/logger');

/**
 * Generate mock persona profile based on assessment data
 * @param {Object} assessmentData - Assessment data
 * @param {String} jobId - Job ID for logging
 * @returns {Promise<Object>} - Mock persona profile
 */
const generateMockPersonaProfile = async (assessmentData, jobId) => {
  try {
    logger.info('Generating mock persona profile', { jobId });

    // Simulate AI processing delay - 20 seconds for faster testing
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Extract assessment data for dynamic mock generation
    const { riasec, ocean, viaIs } = assessmentData;

    // Determine archetype based on highest RIASEC scores
    const riasecEntries = Object.entries(riasec);
    const topRiasec = riasecEntries.reduce((a, b) => riasec[a[0]] > riasec[b[0]] ? a : b);
    const secondRiasec = riasecEntries.filter(entry => entry[0] !== topRiasec[0])
      .reduce((a, b) => riasec[a[0]] > riasec[b[0]] ? a : b);

    // Generate archetype based on top RIASEC combinations
    const archetypeMap = {
      'realistic-investigative': 'The Practical Analyst',
      'realistic-conventional': 'The Systematic Builder',
      'investigative-artistic': 'The Creative Researcher',
      'investigative-realistic': 'The Technical Problem Solver',
      'artistic-social': 'The Creative Communicator',
      'artistic-investigative': 'The Innovative Thinker',
      'social-enterprising': 'The People Leader',
      'social-artistic': 'The Empathetic Creator',
      'enterprising-social': 'The Charismatic Leader',
      'enterprising-conventional': 'The Strategic Organizer',
      'conventional-realistic': 'The Detail-Oriented Implementer',
      'conventional-investigative': 'The Methodical Analyst'
    };

    const archetypeKey = `${topRiasec[0]}-${secondRiasec[0]}`;
    const archetype = archetypeMap[archetypeKey] || 'The Balanced Professional';

    // Generate strengths based on top scores
    const strengths = generateStrengths(riasec, ocean, viaIs);
    
    // Generate weaknesses based on low scores
    const weaknesses = generateWeaknesses(riasec, ocean, viaIs);

    // Generate career recommendations based on RIASEC profile
    const careerRecommendation = generateCareerRecommendations(riasec, ocean);

    // Generate insights based on personality profile
    const insights = generateInsights(riasec, ocean, viaIs);

    // Generate work environment based on personality
    const workEnvironment = generateWorkEnvironment(riasec, ocean);

    // Generate role models based on archetype and interests
    const roleModel = generateRoleModels(topRiasec[0], secondRiasec[0]);

    // Generate short summary
    const shortSummary = generateShortSummary(archetype, topRiasec, ocean);

    // Generate additional required fields
    const coreMotivators = generateCoreMotivators(riasec, ocean);
    const learningStyle = generateLearningStyle(ocean);
    const strengthSummary = generateStrengthSummary(strengths);
    const weaknessSummary = generateWeaknessSummary(weaknesses);
    const skillSuggestion = generateSkillSuggestions(riasec, ocean);
    const possiblePitfalls = generatePossiblePitfalls(riasec, ocean);
    const riskTolerance = generateRiskTolerance(ocean);
    const developmentActivities = generateDevelopmentActivities(riasec, ocean);

    const mockProfile = {
      archetype,
      coreMotivators,
      learningStyle,
      shortSummary,
      strengthSummary,
      strengths,
      weaknessSummary,
      weaknesses,
      careerRecommendation,
      insights,
      skillSuggestion,
      possiblePitfalls,
      riskTolerance,
      workEnvironment,
      roleModel,
      developmentActivities
    };

    logger.info('Mock persona profile generated successfully', {
      jobId,
      archetype,
      strengthsCount: strengths.length,
      weaknessesCount: weaknesses.length,
      careerCount: careerRecommendation.length
    });

    return mockProfile;

  } catch (error) {
    logger.error('Failed to generate mock persona profile', {
      jobId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Generate strengths based on assessment scores
 */
const generateStrengths = (riasec, ocean, viaIs) => {
  const strengths = [];
  
  // RIASEC-based strengths
  if (riasec.realistic > 70) strengths.push('Kemampuan praktis dan hands-on yang kuat');
  if (riasec.investigative > 70) strengths.push('Kemampuan analitis dan problem-solving yang excellent');
  if (riasec.artistic > 70) strengths.push('Kreativitas dan kemampuan berpikir out-of-the-box');
  if (riasec.social > 70) strengths.push('Kemampuan interpersonal dan empati yang tinggi');
  if (riasec.enterprising > 70) strengths.push('Leadership dan kemampuan persuasi yang natural');
  if (riasec.conventional > 70) strengths.push('Organisasi dan attention to detail yang sangat baik');

  // OCEAN-based strengths
  if (ocean.openness > 70) strengths.push('Keterbukaan terhadap ide baru dan pengalaman');
  if (ocean.conscientiousness > 70) strengths.push('Disiplin dan reliability yang tinggi');
  if (ocean.extraversion > 70) strengths.push('Energi sosial dan kemampuan networking yang kuat');
  if (ocean.agreeableness > 70) strengths.push('Kemampuan kerjasama dan diplomasi');

  // VIA-IS based strengths (top 3)
  const viaEntries = Object.entries(viaIs).sort((a, b) => b[1] - a[1]).slice(0, 3);
  viaEntries.forEach(([strength, score]) => {
    if (score > 75) {
      const strengthMap = {
        creativity: 'Kreativitas dan inovasi yang luar biasa',
        curiosity: 'Rasa ingin tahu dan semangat belajar yang tinggi',
        judgment: 'Critical thinking dan kemampuan evaluasi yang tajam',
        loveOfLearning: 'Passion untuk pembelajaran berkelanjutan',
        perseverance: 'Ketekunan dan daya tahan yang kuat',
        leadership: 'Kemampuan memimpin dan menginspirasi orang lain'
      };
      if (strengthMap[strength]) {
        strengths.push(strengthMap[strength]);
      }
    }
  });

  // Ensure minimum 3 strengths by adding generic ones if needed
  if (strengths.length < 3) {
    const genericStrengths = [
      'Kemampuan adaptasi yang baik dalam berbagai situasi',
      'Dedikasi dan komitmen terhadap pekerjaan',
      'Kemampuan belajar dan berkembang secara berkelanjutan',
      'Integritas dan etika kerja yang kuat',
      'Kemampuan komunikasi yang efektif'
    ];

    // Add generic strengths until we have at least 3
    for (let i = 0; i < genericStrengths.length && strengths.length < 3; i++) {
      if (!strengths.includes(genericStrengths[i])) {
        strengths.push(genericStrengths[i]);
      }
    }
  }

  return strengths.slice(0, 5); // Limit to 5 strengths
};

/**
 * Generate weaknesses based on low assessment scores
 */
const generateWeaknesses = (riasec, ocean, viaIs) => {
  const weaknesses = [];

  // OCEAN-based weaknesses
  if (ocean.neuroticism > 60) weaknesses.push('Kecenderungan stress dan anxiety dalam situasi pressure');
  if (ocean.conscientiousness < 40) weaknesses.push('Kesulitan dalam manajemen waktu dan organisasi');
  if (ocean.extraversion < 40) weaknesses.push('Kurang nyaman dalam situasi sosial yang intens');
  if (ocean.agreeableness < 40) weaknesses.push('Kesulitan dalam kompromi dan diplomasi');
  if (ocean.openness < 40) weaknesses.push('Resistensi terhadap perubahan dan ide-ide baru');

  // RIASEC-based weaknesses
  if (riasec.social < 40) weaknesses.push('Kurang optimal dalam peran yang membutuhkan interaksi sosial intensif');
  if (riasec.conventional < 40) weaknesses.push('Kesulitan mengikuti prosedur dan sistem yang rigid');
  if (riasec.enterprising < 40) weaknesses.push('Kurang nyaman dalam peran leadership dan sales');

  // VIA-IS based weaknesses (bottom 3)
  const viaEntries = Object.entries(viaIs).sort((a, b) => a[1] - b[1]).slice(0, 3);
  viaEntries.forEach(([weakness, score]) => {
    if (score < 40) {
      const weaknessMap = {
        selfRegulation: 'Kesulitan dalam self-control dan manajemen emosi',
        prudence: 'Kecenderungan impulsif dalam pengambilan keputusan',
        humility: 'Kesulitan menerima feedback dan mengakui keterbatasan',
        forgiveness: 'Kesulitan move on dari konflik atau kekecewaan'
      };
      if (weaknessMap[weakness]) {
        weaknesses.push(weaknessMap[weakness]);
      }
    }
  });

  // Ensure minimum 3 weaknesses by adding generic ones if needed
  if (weaknesses.length < 3) {
    const genericWeaknesses = [
      'Perlu pengembangan dalam area komunikasi interpersonal',
      'Dapat meningkatkan fleksibilitas dalam menghadapi perubahan',
      'Membutuhkan pengembangan dalam manajemen waktu yang lebih efektif',
      'Perlu peningkatan dalam kemampuan delegasi dan teamwork',
      'Dapat mengembangkan patience dalam menghadapi proses yang lambat'
    ];

    // Add generic weaknesses until we have at least 3
    for (let i = 0; i < genericWeaknesses.length && weaknesses.length < 3; i++) {
      if (!weaknesses.includes(genericWeaknesses[i])) {
        weaknesses.push(genericWeaknesses[i]);
      }
    }
  }

  return weaknesses.slice(0, 5); // Limit to 5 weaknesses
};

/**
 * Generate career recommendations based on RIASEC and OCEAN
 */
const generateCareerRecommendations = (riasec, ocean) => {
  const careers = [];

  // Get top 2 RIASEC interests
  const riasecEntries = Object.entries(riasec).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topInterests = riasecEntries.map(entry => entry[0]);

  // Career mapping based on RIASEC combinations
  const careerMap = {
    'realistic': ['Software Engineer', 'Data Scientist', 'Mechanical Engineer', 'Architect'],
    'investigative': ['Research Scientist', 'Data Analyst', 'Psychologist', 'Medical Doctor'],
    'artistic': ['UX/UI Designer', 'Content Creator', 'Marketing Creative', 'Product Designer'],
    'social': ['Human Resources Manager', 'Teacher', 'Counselor', 'Social Worker'],
    'enterprising': ['Business Development Manager', 'Sales Director', 'Entrepreneur', 'Project Manager'],
    'conventional': ['Financial Analyst', 'Operations Manager', 'Quality Assurance', 'Administrative Manager']
  };

  // Generate careers based on top interests
  topInterests.forEach(interest => {
    if (careerMap[interest]) {
      careerMap[interest].forEach(career => {
        if (!careers.find(c => c.careerName === career)) {
          careers.push({
            careerName: career,
            careerProspect: generateCareerProspect(career, riasec, ocean)
          });
        }
      });
    }
  });

  // Ensure minimum 3 careers by adding generic ones if needed
  if (careers.length < 3) {
    const genericCareers = [
      { careerName: 'Business Analyst', careerProspect: generateCareerProspect('Business Analyst', riasec, ocean) },
      { careerName: 'Project Coordinator', careerProspect: generateCareerProspect('Project Coordinator', riasec, ocean) },
      { careerName: 'Operations Specialist', careerProspect: generateCareerProspect('Operations Specialist', riasec, ocean) },
      { careerName: 'Customer Success Manager', careerProspect: generateCareerProspect('Customer Success Manager', riasec, ocean) }
    ];

    // Add generic careers until we have at least 3
    for (let i = 0; i < genericCareers.length && careers.length < 3; i++) {
      if (!careers.find(c => c.careerName === genericCareers[i].careerName)) {
        careers.push(genericCareers[i]);
      }
    }
  }

  return careers.slice(0, 5); // Limit to 5 careers (max allowed by schema)
};

/**
 * Generate career prospect for a specific career
 */
const generateCareerProspect = (career, riasec, ocean) => {
  // Base prospects for different career types
  const techCareers = ['Software Engineer', 'Data Scientist', 'Data Analyst', 'UX/UI Designer'];
  const businessCareers = ['Business Development Manager', 'Sales Director', 'Project Manager'];
  const creativeCareers = ['Content Creator', 'Marketing Creative', 'Product Designer'];
  const serviceCareers = ['Teacher', 'Counselor', 'Human Resources Manager'];

  let baseProspect = {
    jobAvailability: 'moderate',
    salaryPotential: 'moderate',
    careerProgression: 'moderate',
    industryGrowth: 'moderate',
    skillDevelopment: 'moderate'
  };

  if (techCareers.includes(career)) {
    baseProspect = {
      jobAvailability: 'high',
      salaryPotential: 'high',
      careerProgression: 'high',
      industryGrowth: 'super high',
      skillDevelopment: 'super high'
    };
  } else if (businessCareers.includes(career)) {
    baseProspect = {
      jobAvailability: 'high',
      salaryPotential: 'high',
      careerProgression: 'super high',
      industryGrowth: 'high',
      skillDevelopment: 'high'
    };
  } else if (creativeCareers.includes(career)) {
    baseProspect = {
      jobAvailability: 'moderate',
      salaryPotential: 'moderate',
      careerProgression: 'moderate',
      industryGrowth: 'high',
      skillDevelopment: 'high'
    };
  } else if (serviceCareers.includes(career)) {
    baseProspect = {
      jobAvailability: 'moderate',
      salaryPotential: 'moderate',
      careerProgression: 'moderate',
      industryGrowth: 'moderate',
      skillDevelopment: 'moderate'
    };
  }

  return baseProspect;
};

/**
 * Generate insights based on personality profile
 */
const generateInsights = (riasec, ocean, viaIs) => {
  const insights = [];

  // Conscientiousness insights
  if (ocean.conscientiousness > 70) {
    insights.push('Manfaatkan kekuatan organisasi Anda dengan mengambil peran yang membutuhkan planning dan execution yang detail');
  } else if (ocean.conscientiousness < 40) {
    insights.push('Fokus pada pengembangan time management dan organizational skills untuk meningkatkan produktivitas');
  } else {
    insights.push('Kembangkan keseimbangan antara struktur dan fleksibilitas dalam pendekatan kerja Anda');
  }

  // Openness insights
  if (ocean.openness > 70) {
    insights.push('Cari lingkungan kerja yang memberikan variasi dan tantangan baru secara konsisten');
  } else if (ocean.openness < 40) {
    insights.push('Fokus pada penguasaan mendalam di bidang keahlian yang sudah familiar');
  } else {
    insights.push('Seimbangkan eksplorasi hal baru dengan pendalaman expertise yang sudah ada');
  }

  // Extraversion insights
  if (ocean.extraversion > 70) {
    insights.push('Manfaatkan energy sosial Anda dalam peran yang melibatkan networking dan team collaboration');
  } else if (ocean.extraversion < 40) {
    insights.push('Pilih peran yang memungkinkan deep work dan interaksi sosial yang terbatas namun meaningful');
  } else {
    insights.push('Cari keseimbangan antara kolaborasi tim dan waktu untuk refleksi individual');
  }

  // RIASEC insights
  const topRiasec = Object.entries(riasec).reduce((a, b) => riasec[a[0]] > riasec[b[0]] ? a : b);
  if (topRiasec[0] === 'investigative') {
    insights.push('Kembangkan kemampuan research dan analytical thinking melalui proyek-proyek yang challenging');
  } else if (topRiasec[0] === 'artistic') {
    insights.push('Alokasikan waktu untuk eksplorasi kreatif dan pengembangan ide-ide inovatif');
  } else if (topRiasec[0] === 'social') {
    insights.push('Fokus pada pengembangan kemampuan interpersonal dan leadership skills');
  } else {
    insights.push('Identifikasi dan kembangkan kekuatan unik Anda sesuai dengan minat dominan');
  }

  // VIA-IS insights
  const topVia = Object.entries(viaIs).reduce((a, b) => viaIs[a[0]] > viaIs[b[0]] ? a : b);
  if (topVia[0] === 'creativity') {
    insights.push('Alokasikan waktu regular untuk creative exploration dan brainstorming sessions');
  } else if (topVia[0] === 'perseverance') {
    insights.push('Manfaatkan ketekunan Anda untuk menyelesaikan proyek-proyek jangka panjang yang kompleks');
  } else {
    insights.push('Kembangkan kekuatan karakter dominan Anda melalui praktik dan aplikasi yang konsisten');
  }

  // Ensure we have at least 3 insights
  while (insights.length < 3) {
    insights.push('Terus kembangkan self-awareness dan adaptabilitas dalam menghadapi tantangan profesional');
  }

  return insights.slice(0, 5); // Limit to 5 insights (max allowed by schema)
};

/**
 * Generate work environment description
 */
const generateWorkEnvironment = (riasec, ocean) => {
  let environment = 'Lingkungan kerja ideal Anda adalah ';

  if (ocean.extraversion > 60) {
    environment += 'yang collaborative dan dynamic, dengan banyak interaksi tim dan networking opportunities. ';
  } else {
    environment += 'yang memungkinkan fokus mendalam dengan minimal distraction, namun tetap supportive. ';
  }

  if (riasec.investigative > 60) {
    environment += 'Anda akan thriving di tempat yang menghargai analytical thinking dan problem-solving, ';
  }

  if (riasec.artistic > 60) {
    environment += 'dengan kebebasan untuk eksplorasi kreatif dan inovasi. ';
  }

  if (ocean.conscientiousness > 60) {
    environment += 'Struktur yang jelas dan goal-oriented akan membantu Anda perform optimal, ';
  }

  environment += 'dengan leadership yang memberikan autonomy namun tetap available untuk guidance ketika dibutuhkan.';

  return environment;
};

/**
 * Generate role models based on interests
 */
const generateRoleModels = (topInterest, secondInterest) => {
  const roleModelMap = {
    'realistic': ['Elon Musk', 'Steve Wozniak', 'James Dyson'],
    'investigative': ['Marie Curie', 'Stephen Hawking', 'Jane Goodall'],
    'artistic': ['Steve Jobs', 'Jony Ive', 'David Kelley'],
    'social': ['Oprah Winfrey', 'Nelson Mandela', 'Mother Teresa'],
    'enterprising': ['Richard Branson', 'Jack Ma', 'Sara Blakely'],
    'conventional': ['Warren Buffett', 'Tim Cook', 'Sheryl Sandberg']
  };

  const roleModels = [];
  
  if (roleModelMap[topInterest]) {
    roleModels.push(...roleModelMap[topInterest]);
  }
  
  if (roleModelMap[secondInterest] && secondInterest !== topInterest) {
    roleModels.push(...roleModelMap[secondInterest].slice(0, 2));
  }

  // Add some universal role models
  const universalModels = ['Bill Gates', 'Michelle Obama', 'B.J. Habibie', 'Susi Pudjiastuti', 'Nadiem Makarim'];
  roleModels.push(...universalModels);

  // Remove duplicates
  const uniqueRoleModels = [...new Set(roleModels)];

  // Ensure minimum 2 role models (matching schema)
  if (uniqueRoleModels.length < 2) {
    const additionalModels = ['Albert Einstein', 'Oprah Winfrey', 'Steve Jobs', 'Marie Curie'];
    for (let i = 0; i < additionalModels.length && uniqueRoleModels.length < 2; i++) {
      if (!uniqueRoleModels.includes(additionalModels[i])) {
        uniqueRoleModels.push(additionalModels[i]);
      }
    }
  }

  return uniqueRoleModels.slice(0, 3); // Limit to 3 (matching schema max)
};

/**
 * Generate short summary
 */
const generateShortSummary = (archetype, topRiasec, ocean) => {
  let summary = `Anda adalah seorang ${archetype} dengan kekuatan utama di bidang ${topRiasec[0]}. `;
  
  if (ocean.conscientiousness > 60) {
    summary += 'Kepribadian yang terorganisir dan goal-oriented membuat Anda reliable dalam execution. ';
  }
  
  if (ocean.openness > 60) {
    summary += 'Keterbukaan terhadap pengalaman baru memungkinkan Anda untuk terus berkembang dan beradaptasi. ';
  }
  
  summary += 'Kombinasi unik dari analytical thinking dan practical approach membuat Anda valuable dalam berbagai konteks profesional.';
  
  return summary;
};

/**
 * Generate core motivators
 */
const generateCoreMotivators = (riasec, ocean) => {
  const motivators = [];

  // Based on top RIASEC scores
  const sortedRiasec = Object.entries(riasec).sort((a, b) => b[1] - a[1]);
  const topInterest = sortedRiasec[0][0];

  const motivatorMap = {
    'realistic': ['Problem-Solving', 'Hands-on Work', 'Technical Mastery'],
    'investigative': ['Learning & Discovery', 'Research & Analysis', 'Knowledge Building'],
    'artistic': ['Creative Expression', 'Innovation', 'Aesthetic Achievement'],
    'social': ['Helping Others', 'Community Impact', 'Relationship Building'],
    'enterprising': ['Leadership', 'Achievement', 'Influence & Persuasion'],
    'conventional': ['Organization', 'Efficiency', 'Structure & Order']
  };

  if (motivatorMap[topInterest]) {
    motivators.push(...motivatorMap[topInterest].slice(0, 2));
  }

  // Add based on personality
  if (ocean.openness > 60) {
    motivators.push('Continuous Learning');
  }
  if (ocean.conscientiousness > 60) {
    motivators.push('Excellence & Quality');
  }

  return motivators.slice(0, 4);
};

/**
 * Generate learning style
 */
const generateLearningStyle = (ocean) => {
  if (ocean.openness > 70) {
    return 'Experiential & Exploratory';
  } else if (ocean.conscientiousness > 70) {
    return 'Structured & Systematic';
  } else if (ocean.extraversion > 60) {
    return 'Collaborative & Interactive';
  } else {
    return 'Visual & Kinesthetic';
  }
};

/**
 * Generate strength summary
 */
const generateStrengthSummary = (strengths) => {
  return `Kekuatan utama Anda terletak pada ${strengths.slice(0, 3).join(', ').toLowerCase()}. Kombinasi unik dari kemampuan ini membuat Anda mampu memberikan kontribusi yang valuable dalam berbagai situasi dan tantangan.`;
};

/**
 * Generate weakness summary
 */
const generateWeaknessSummary = (weaknesses) => {
  return `Area yang perlu dikembangkan meliputi ${weaknesses.slice(0, 2).join(' dan ').toLowerCase()}. Dengan awareness dan usaha yang konsisten, area-area ini dapat menjadi kekuatan di masa depan.`;
};

/**
 * Generate skill suggestions
 */
const generateSkillSuggestions = (riasec, ocean) => {
  const suggestions = [];

  const sortedRiasec = Object.entries(riasec).sort((a, b) => b[1] - a[1]);
  const topInterest = sortedRiasec[0][0];

  const skillMap = {
    'realistic': ['Technical problem-solving', 'Project management', 'Quality control'],
    'investigative': ['Data analysis', 'Research methodology', 'Critical thinking'],
    'artistic': ['Creative thinking', 'Design principles', 'Innovation techniques'],
    'social': ['Communication skills', 'Emotional intelligence', 'Team collaboration'],
    'enterprising': ['Leadership skills', 'Strategic planning', 'Negotiation'],
    'conventional': ['Process optimization', 'Data management', 'Attention to detail']
  };

  if (skillMap[topInterest]) {
    suggestions.push(...skillMap[topInterest]);
  }

  // Add digital literacy
  suggestions.push('Digital literacy', 'Adaptability');

  return suggestions.slice(0, 5);
};

/**
 * Generate possible pitfalls
 */
const generatePossiblePitfalls = (riasec, ocean) => {
  const pitfalls = [];

  const sortedRiasec = Object.entries(riasec).sort((a, b) => b[1] - a[1]);
  const topInterest = sortedRiasec[0][0];

  const pitfallMap = {
    'realistic': ['Mengabaikan aspek interpersonal', 'Terlalu fokus pada detail teknis'],
    'investigative': ['Analysis paralysis', 'Kurang action-oriented'],
    'artistic': ['Perfectionism yang berlebihan', 'Kesulitan dengan struktur'],
    'social': ['Burnout karena terlalu fokus pada orang lain', 'Kesulitan membuat keputusan sulit'],
    'enterprising': ['Overconfidence', 'Mengabaikan detail penting'],
    'conventional': ['Resistance to change', 'Terlalu rigid dalam pendekatan']
  };

  if (pitfallMap[topInterest]) {
    pitfalls.push(...pitfallMap[topInterest]);
  }

  // Add based on personality
  if (ocean.neuroticism > 60) {
    pitfalls.push('Overthinking dan anxiety');
  }

  return pitfalls.slice(0, 4);
};

/**
 * Generate risk tolerance
 */
const generateRiskTolerance = (ocean) => {
  const riskScore = (ocean.openness + ocean.extraversion - ocean.neuroticism) / 3;

  if (riskScore > 70) return 'high';
  if (riskScore > 50) return 'moderate';
  if (riskScore > 30) return 'low';
  return 'very low';
};

/**
 * Generate development activities
 */
const generateDevelopmentActivities = (riasec, ocean) => {
  const sortedRiasec = Object.entries(riasec).sort((a, b) => b[1] - a[1]);
  const topInterest = sortedRiasec[0][0];

  const extracurricularMap = {
    'realistic': ['Klub Robotik', 'Olimpiade Sains', 'Maker Space'],
    'investigative': ['Klub Penelitian', 'Science Fair', 'Debat Ilmiah'],
    'artistic': ['Klub Seni', 'Creative Writing', 'Design Competition'],
    'social': ['Volunteer Work', 'Student Council', 'Peer Mentoring'],
    'enterprising': ['Business Club', 'Entrepreneurship Competition', 'Leadership Training'],
    'conventional': ['Student Government', 'Academic Committee', 'Event Organization']
  };

  const projectMap = {
    'realistic': ['Membuat prototype sederhana', 'Eksperimen sains praktis'],
    'investigative': ['Research project', 'Data analysis project'],
    'artistic': ['Portfolio kreatif', 'Art installation'],
    'social': ['Community service project', 'Social impact initiative'],
    'enterprising': ['Business plan competition', 'Startup simulation'],
    'conventional': ['Process improvement project', 'Database management']
  };

  return {
    extracurricular: extracurricularMap[topInterest] || ['Academic Club', 'Volunteer Work'],
    projectIdeas: projectMap[topInterest] || ['Personal development project', 'Skill-building initiative'],
    bookRecommendations: [
      {
        title: 'Mindset: The New Psychology of Success',
        author: 'Carol Dweck',
        reason: 'Untuk mengembangkan growth mindset yang essential untuk kesuksesan'
      },
      {
        title: 'The 7 Habits of Highly Effective People',
        author: 'Stephen Covey',
        reason: 'Untuk membangun kebiasaan yang mendukung pencapaian tujuan'
      }
    ]
  };
};

module.exports = {
  generateMockPersonaProfile
};
