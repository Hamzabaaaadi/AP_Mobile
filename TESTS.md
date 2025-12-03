# 🧪 Guide de Test - Bus Tracking System

## Tests Rapides pour Validation

### 🚀 Démarrage Rapide

1. **Exécuter le script de démarrage:**
   ```bash
   # Windows
   start.bat
   
   # Linux/Mac
   ./deploy.sh dev
   ```

2. **Vérifier que le backend fonctionne:**
   ```bash
   curl http://localhost:5000/api/health
   # Réponse attendue: {"status": "healthy", ...}
   ```

3. **Voir les statistiques système:**
   ```bash
   curl http://localhost:5000/api/stats
   # Affiche le nombre de bus, arrêts, chauffeurs
   ```

### 📱 Tests Applications Mobiles

#### App Chauffeur

1. **Connexion:**
   - Email: `jean.dupont@buscompany.com`
   - Mot de passe: `password123`

2. **Tests de base:**
   - ✅ Connexion réussie
   - ✅ Vue tableau de bord
   - ✅ Bus assigné visible (Bus 101)
   - ✅ Passage en service (toggle switch)
   - ✅ Suivi GPS démarre automatiquement

3. **Gestion occupation:**
   - ✅ Écran occupation accessible
   - ✅ Compteurs +/- fonctionnent
   - ✅ Pourcentage mis à jour

#### App Utilisateur

1. **Navigation:**
   - ✅ Carte charge correctement
   - ✅ Position utilisateur détectée
   - ✅ Bus visibles sur la carte

2. **Fonctionnalités:**
   - ✅ Liste des arrêts accessible
   - ✅ Recherche d'arrêts fonctionne
   - ✅ Détails arrêt avec prédictions
   - ✅ Favoris fonctionnent

### 🔧 Tests API Backend

#### Authentification
```bash
# Connexion chauffeur
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jean.dupont@buscompany.com","password":"password123"}'

# Sauvegarder le token pour les tests suivants
TOKEN="<token_obtenu>"
```

#### Bus et Positions
```bash
# Liste des bus actifs
curl http://localhost:5000/api/buses/active

# Envoyer une position GPS (nécessite authentification)
curl -X POST http://localhost:5000/api/positions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bus_id": 1,
    "latitude": 43.6047,
    "longitude": 1.4442,
    "speed": 25,
    "heading": 180,
    "accuracy": 10
  }'

# Positions actuelles
curl http://localhost:5000/api/positions/current
```

#### Arrêts et Prédictions
```bash
# Liste des arrêts
curl http://localhost:5000/api/stops

# Arrêts proches
curl "http://localhost:5000/api/stops/nearby?latitude=43.6047&longitude=1.4442&radius=2"

# Prédictions pour un arrêt
curl http://localhost:5000/api/stops/1/predictions
```

#### Occupation
```bash
# Mettre à jour occupation (nécessite authentification)
curl -X POST http://localhost:5000/api/occupancy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bus_id": 1, "passenger_count": 15}'

# Statistiques occupation
curl http://localhost:5000/api/occupancy/stats
```

### 🧩 Scénario de Test Complet

#### Simulation Trajet Complet

1. **Préparation:**
   ```bash
   # Vérifier que le système est démarré
   curl http://localhost:5000/api/health
   ```

2. **Chauffeur se connecte:**
   - Ouvrir app chauffeur
   - Se connecter avec compte test
   - Activer le service sur Bus 101

3. **Simulation GPS:**
   ```bash
   # Position 1 - Centre-ville
   curl -X POST http://localhost:5000/api/positions \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bus_id":1,"latitude":43.6047,"longitude":1.4442,"speed":0}'

   # Position 2 - En route
   curl -X POST http://localhost:5000/api/positions \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bus_id":1,"latitude":43.6000,"longitude":1.4500,"speed":30}'

   # Position 3 - Proche université
   curl -X POST http://localhost:5000/api/positions \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bus_id":1,"latitude":43.5618,"longitude":1.4673,"speed":15}'
   ```

4. **Gestion occupation:**
   ```bash
   # 10 passagers montent
   curl -X POST http://localhost:5000/api/occupancy \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bus_id":1,"passenger_count":10}'

   # 5 passagers descendent
   curl -X POST http://localhost:5000/api/occupancy \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"bus_id":1,"passenger_count":5}'
   ```

5. **Vérification côté utilisateur:**
   - Ouvrir app utilisateur
   - Voir le bus sur la carte
   - Consulter les prédictions d'arrivée
   - Vérifier niveau d'occupation

### ✅ Checklist de Validation

#### Backend ✅
- [ ] Serveur démarre sans erreur
- [ ] Base de données initialisée avec données test
- [ ] API répond aux endpoints principaux
- [ ] Authentification JWT fonctionne
- [ ] Positions GPS sont enregistrées
- [ ] Prédictions sont calculées
- [ ] Occupation est mise à jour

#### App Chauffeur ✅
- [ ] Connexion avec comptes test
- [ ] Tableau de bord affiché
- [ ] Bus assignés visibles
- [ ] Toggle service fonctionne
- [ ] Écran occupation accessible
- [ ] Compteurs occupation fonctionnent
- [ ] GPS démarre automatiquement

#### App Utilisateur ✅
- [ ] Carte charge et s'affiche
- [ ] Localisation utilisateur détectée
- [ ] Bus visibles sur carte
- [ ] Liste arrêts accessible
- [ ] Recherche arrêts fonctionne
- [ ] Détails arrêts avec horaires
- [ ] Favoris ajoutables/supprimables
- [ ] Navigation entre écrans fluide

#### Temps Réel ✅
- [ ] Positions mises à jour en direct
- [ ] Prédictions recalculées
- [ ] Occupation synchronisée
- [ ] Apps se rafraîchissent automatiquement

### 🐛 Problèmes Fréquents et Solutions

#### Backend ne démarre pas
```bash
# Vérifier les dépendances
pip install -r backend/requirements.txt

# Vérifier Python version
python --version  # Doit être 3.8+

# Voir les logs d'erreur
python backend/app.py
```

#### Apps mobiles ne se connectent pas
```bash
# Vérifier l'IP dans api.js
# Remplacer 192.168.1.100 par votre IP locale

# Tester la connectivité
ping 192.168.1.100
curl http://192.168.1.100:5000/api/health
```

#### GPS ne fonctionne pas
- Utiliser un vrai appareil (pas simulateur)
- Autoriser permissions localisation
- Tester en extérieur

#### Prédictions incohérentes
- Envoyer plusieurs positions GPS
- Attendre 1-2 minutes pour calibrage
- Vérifier configuration lignes/arrêts

### 📊 Métriques de Succès

Un test est **réussi** si:
- ✅ Temps de démarrage < 2 minutes
- ✅ API répond en < 500ms
- ✅ Apps mobiles fluides (pas de lag)
- ✅ GPS précis à ±50 mètres
- ✅ Prédictions dans ±2 minutes
- ✅ Synchronisation temps réel < 30 secondes

### 🔬 Tests Avancés

#### Stress Test
```bash
# Envoyer 100 positions rapidement
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/positions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"bus_id\":1,\"latitude\":$((43600 + i)),\"longitude\":1444,\"speed\":25}"
done
```

#### Test Multi-Bus
```bash
# Simuler plusieurs bus simultanément
# Bus 1
curl -X POST ... -d '{"bus_id":1,...}'
# Bus 2  
curl -X POST ... -d '{"bus_id":2,...}'
```

#### Test Déconnexion Réseau
1. Couper le WiFi sur l'app chauffeur
2. Continuer à "conduire" (positions stockées)
3. Reconnecter le réseau
4. Vérifier synchronisation automatique

---

**🎯 Objectif:** Tous les tests passent = Système prêt pour démo/production!

*Temps estimé pour tous les tests: 30-45 minutes*
