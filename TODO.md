# TODO - Pagination (10 éléments) et filtrage

- [ ] Mettre à niveau Reports.tsx : remplacer `slice(0, 50/100)` par pagination + filtres (page + limit=10) côté API.
- [ ] Vérifier/synchroniser les pages (Sales, Products, Customers, Suppliers, Users, Invoices, Payments, Purchases, Stocks/Inventaire & Mouvements, WhatsApp) pour que chaque table envoie `limit: 10` (ou équivalent) et que la taille d’affichage soit exactement 10.
- [ ] S’assurer que chaque table utilise le bon champ `meta.limit` pour la pagination (et que `limit` passé au composant `Pagination` est cohérent).
- [ ] Confirmer que les endpoints backend supportent `limit` + `page` pour tous les tableaux concernés (et ajouter si manquant).
- [ ] Faire un passage sur Stocks : mouvements et inventaire doivent utiliser limit=10.
- [ ] Lancer build/test TypeScript côté frontend pour valider la compilation.
- [ ] Lancer la vérification manuelle : chaque page de table montre 10 lignes max et filtrage fonctionne.

