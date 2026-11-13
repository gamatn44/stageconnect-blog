function creerErreur(message) {
  const erreur = new Error(message);
  erreur.status = 400;
  return erreur;
}

function lireEntierPositif(valeur, nom, valeurDefaut) {
  if (valeur === undefined) {
    return valeurDefaut;
  }

  if (
    (typeof valeur !== "string" && typeof valeur !== "number") ||
    !/^\d+$/.test(String(valeur))
  ) {
    throw creerErreur(`${nom} invalide`);
  }

  const nombre = Number(valeur);
  if (!Number.isSafeInteger(nombre) || nombre < 1) {
    throw creerErreur(`${nom} invalide`);
  }

  return nombre;
}

async function rechercherAvecOptions(Model, query, options = {}) {
  const {
    champsRecherche = [],
    champsFiltres = [],
    champsTri = ["createdAt"],
    triDefaut = "createdAt"
  } = options;

  const page = lireEntierPositif(query.page, "Pagination", 1);
  const limit = lireEntierPositif(query.limit, "Pagination", 10);

  if (limit > 100) {
    throw creerErreur("Pagination invalide");
  }

  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) {
    throw creerErreur("Pagination invalide");
  }

  const parametresConnus = new Set([
    "page",
    "limit",
    "search",
    "sortBy",
    "order",
    ...champsFiltres
  ]);
  if (Object.keys(query).some((cle) => !parametresConnus.has(cle))) {
    throw creerErreur("Paramètre de recherche ou de filtrage invalide");
  }

  const filtre = {};

  if (query.search !== undefined) {
    if (typeof query.search !== "string") {
      throw creerErreur("Paramètre de recherche invalide");
    }

    const recherche = query.search.trim();
    if (recherche && champsRecherche.length) {
      const terme = recherche.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filtre.$or = champsRecherche.map((champ) => ({
        [champ]: { $regex: terme, $options: "i" }
      }));
    }
  }

  for (const champ of champsFiltres) {
    if (query[champ] !== undefined) {
      const valeur = query[champ];
      if (
        valeur === null ||
        (typeof valeur !== "string" &&
          typeof valeur !== "number" &&
          typeof valeur !== "boolean")
      ) {
        throw creerErreur(`Filtre invalide : ${champ}`);
      }

      filtre[champ] = valeur;
    }
  }

  const sortBy = query.sortBy === undefined ? triDefaut : query.sortBy;
  const order = query.order === undefined ? "desc" : query.order;

  if (
    typeof sortBy !== "string" ||
    !champsTri.includes(sortBy) ||
    typeof order !== "string" ||
    !["asc", "desc"].includes(order)
  ) {
    throw creerErreur("Paramètres de tri invalides");
  }

  const [resultats, total] = await Promise.all([
    Model.find(filtre)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit),
    Model.countDocuments(filtre)
  ]);

  return {
    resultats,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

module.exports = { rechercherAvecOptions };
