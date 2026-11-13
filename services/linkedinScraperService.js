const axios = require('axios');
const cheerio = require('cheerio');
const Recommendation = require('../models/Recommendation');

async function scrapeLinkedInRecommendations(etudiantId, domainKeyword = 'Stage Node.js', location = 'Tunisie') {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(domainKeyword)}&location=${encodeURIComponent(location)}&start=0`;

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 10000
  });

  const $ = cheerio.load(html);
  const offresScrappees = [];

  $('li').each((i, el) => {
    if (offresScrappees.length >= 5) return false;
    const titrePoste = $(el).find('.base-search-card__title').text().trim();
    const entreprise = $(el).find('.base-search-card__subtitle').text().trim();
    const lieu = $(el).find('.job-search-card__location').text().trim();
    const lien = $(el).find('a.base-card__full-link').attr('href') || '';

    if (titrePoste && entreprise) {
      offresScrappees.push({ titrePoste, entreprise, lieu, lien });
    }
  });

  const nouvellesRecommandations = [];
  for (const item of offresScrappees) {
    // Vérification Anti-Doublon
    const existeDeja = await Recommendation.findOne({
      source: 'LINKEDIN_SCRAPING',
      etudiantCibleId: etudiantId,
      'linkedInData.titrePoste': item.titrePoste,
      'linkedInData.entreprise': item.entreprise
    });

    if (!existeDeja) {
      const rec = await Recommendation.create({
        source: 'LINKEDIN_SCRAPING',
        etudiantCibleId: etudiantId,
        linkedInData: item,
        commentaire: `Offre LinkedIn (${domainKeyword}) trouvée à ${item.lieu}`,
        isUrgente: false,
        statut: 'ENVOYEE'
      });
      nouvellesRecommandations.push(rec);
    }
  }

  return nouvellesRecommandations;
}

module.exports = { scrapeLinkedInRecommendations };
