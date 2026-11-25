function evaluerMatch(etudiant, offre) {
  // 1. Critère éliminatoire (Type de stage obligatoire)
  if (
    offre.typeStageObligatoire &&
    etudiant.typeStage &&
    offre.typeStageObligatoire.toLowerCase() !== etudiant.typeStage.toLowerCase()
  ) {
    return {
      score: 0,
      estElimine: true,
      raisonElimination: `Type de stage incompatible : requis (${offre.typeStageObligatoire}), candidat (${etudiant.typeStage})`,
      isBoosted: false
    };
  }

  // 2. Calcul du score par compétences communes
  const compEtudiant = (etudiant.competences || []).map(c => c.toLowerCase().trim());
  const compOffre = (offre.competencesRequises || []).map(c => c.toLowerCase().trim());

  let scoreBase = 0;
  if (compOffre.length > 0) {
    const skillsCommuns = compOffre.filter(skill => compEtudiant.includes(skill));
    scoreBase = Math.round((skillsCommuns.length / compOffre.length) * 100);
  }

  // 3. Système de Boost (+20% plafonné à 100%)
  const boostActif = Boolean(etudiant.isBoosted || offre.isUrgent);
  const scoreFinal = boostActif ? Math.min(100, scoreBase + 20) : scoreBase;

  return {
    score: scoreFinal,
    estElimine: false,
    raisonElimination: null,
    isBoosted: boostActif
  };
}

module.exports = { evaluerMatch };
